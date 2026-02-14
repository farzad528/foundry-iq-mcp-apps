#!/usr/bin/env node
/**
 * Postinstall script to set up bun from platform-specific optional dependencies.
 * Ported from excalidraw/excalidraw-mcp.
 */
import {
  existsSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  copyFileSync,
  chmodSync,
  writeFileSync,
} from "fs";
import { join, dirname } from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { get } from "https";
import { createGunzip } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const nodeModules = join(projectRoot, "node_modules");
const binDir = join(nodeModules, ".bin");

const os = process.platform;
const arch = process.arch;
const isWindows = os === "win32";
const bunExe = isWindows ? "bun.exe" : "bun";

function detectLibc() {
  if (os !== "linux") return null;
  const muslLoaders = [
    `/lib/ld-musl-${arch === "arm64" ? "aarch64" : "x86_64"}.so.1`,
    "/lib/ld-musl-x86_64.so.1",
    "/lib/ld-musl-aarch64.so.1",
  ];
  for (const loader of muslLoaders) {
    if (existsSync(loader)) return "musl";
  }
  return "glibc";
}

const platformPackages = {
  darwin: {
    arm64: ["bun-darwin-aarch64"],
    x64: ["bun-darwin-x64", "bun-darwin-x64-baseline"],
  },
  linux: {
    arm64: { glibc: ["bun-linux-aarch64"], musl: ["bun-linux-aarch64-musl"] },
    x64: {
      glibc: ["bun-linux-x64", "bun-linux-x64-baseline"],
      musl: ["bun-linux-x64-musl", "bun-linux-x64-musl-baseline"],
    },
  },
  win32: {
    x64: ["bun-windows-x64", "bun-windows-x64-baseline"],
    arm64: ["bun-windows-x64-baseline"],
  },
};

function findBunBinary() {
  let packages = platformPackages[os]?.[arch];
  if (os === "linux" && packages && typeof packages === "object") {
    const libc = detectLibc();
    packages = packages[libc] || [];
  }
  packages = packages || [];

  for (const pkg of packages) {
    const binPath = join(nodeModules, "@oven", pkg, "bin", bunExe);
    if (existsSync(binPath)) return binPath;
  }
  return null;
}

async function downloadBunForWindowsArm64() {
  const pkg = "bun-windows-x64-baseline";
  const version = "1.2.21";
  const url = `https://registry.npmjs.org/@oven/${pkg}/-/${pkg}-${version}.tgz`;
  const destDir = join(nodeModules, "@oven", pkg);

  return new Promise((resolve, reject) => {
    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        get(response.headers.location, handleResponse).on("error", reject);
      } else {
        handleResponse(response);
      }

      function handleResponse(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: ${res.statusCode}`));
          return;
        }
        const chunks = [];
        const gunzip = createGunzip();
        res.pipe(gunzip);
        gunzip.on("data", (chunk) => chunks.push(chunk));
        gunzip.on("end", () => {
          try {
            extractTar(Buffer.concat(chunks), destDir);
            const binPath = join(destDir, "bin", bunExe);
            if (existsSync(binPath)) resolve(binPath);
            else reject(new Error("Binary not found after extraction"));
          } catch (err) {
            reject(err);
          }
        });
        gunzip.on("error", reject);
      }
    }).on("error", reject);
  });
}

function extractTar(buffer, destDir) {
  let offset = 0;
  while (offset < buffer.length) {
    const name = buffer.toString("utf-8", offset, offset + 100).replace(/\0.*$/, "").replace("package/", "");
    const size = parseInt(buffer.toString("utf-8", offset + 124, offset + 136).trim(), 8);
    offset += 512;
    if (!isNaN(size) && size > 0 && name) {
      const filePath = join(destDir, name);
      const fileDir = dirname(filePath);
      if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true });
      writeFileSync(filePath, buffer.subarray(offset, offset + size));
      if (name.endsWith(bunExe) || name === "bin/bun") {
        try { chmodSync(filePath, 0o755); } catch {}
      }
      offset += Math.ceil(size / 512) * 512;
    }
  }
}

function setupBinLink(bunPath) {
  if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });
  const bunLink = join(binDir, bunExe);
  const bunxLink = join(binDir, isWindows ? "bunx.exe" : "bunx");
  for (const link of [bunLink, bunxLink]) {
    try { unlinkSync(link); } catch {}
  }
  if (isWindows) {
    copyFileSync(bunPath, bunLink);
    copyFileSync(bunPath, bunxLink);
  } else {
    symlinkSync(bunPath, bunLink);
    symlinkSync(bunPath, bunxLink);
  }
  console.log(`Bun linked to: ${bunLink}`);
}

async function main() {
  console.log(`[setup-bun] Setting up bun for ${os} ${arch}...`);
  let bunPath = findBunBinary();

  if (!bunPath && os === "win32" && arch === "arm64") {
    try {
      bunPath = await downloadBunForWindowsArm64();
    } catch (err) {
      console.error("Failed to download bun for Windows ARM64:", err.message);
    }
  }

  if (!bunPath) {
    console.log("No bun binary found. Bun will need to be installed separately.");
    process.exit(0);
  }

  try {
    setupBinLink(bunPath);
    const result = spawnSync(bunPath, ["--version"], { encoding: "utf-8" });
    if (result.status === 0) console.log(`Bun ${result.stdout.trim()} installed successfully!`);
  } catch (err) {
    console.error("Failed to set up bun:", err.message);
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
