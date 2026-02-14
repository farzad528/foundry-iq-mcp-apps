#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, renameSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(cmd, env = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function tryRun(cmd, env = {}) {
  try {
    run(cmd, env);
    return true;
  } catch {
    console.log(`  ⚠ Skipped (command not available): ${cmd.split(" ")[0]}`);
    return false;
  }
}

rmSync(join(root, "dist"), { recursive: true, force: true });

// 1. Type-check
run("tsc --noEmit");

// 2. Vite build (singlefile HTML)
run("vite build");

// 3. Move the HTML output to dist root
const srcHtml = join(root, "dist", "src", "mcp-app.html");
if (existsSync(srcHtml)) {
  renameSync(srcHtml, join(root, "dist", "mcp-app.html"));
  rmSync(join(root, "dist", "src"), { recursive: true, force: true });
}

// 4. Build server types
run("tsc -p tsconfig.server.json");

// 5. Bundle server + index (requires bun — optional for Vercel serverless)
tryRun('bun build "src/server.ts" --outdir dist --target node');
tryRun(
  'bun build "src/main.ts" --outfile "dist/index.js" --target node --banner "#!/usr/bin/env node"',
);
