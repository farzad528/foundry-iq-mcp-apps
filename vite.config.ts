import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const isDevelopment = process.env.NODE_ENV === "development";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    sourcemap: isDevelopment ? "inline" : undefined,
    cssMinify: !isDevelopment,
    minify: !isDevelopment,

    rollupOptions: {
      input: path.resolve(__dirname, "src/mcp-app.html"),
      external: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "morphdom",
        "@modelcontextprotocol/ext-apps",
        "@modelcontextprotocol/ext-apps/react",
      ],
      output: {
        paths: {
          "react": "https://esm.sh/react@19.0.0",
          "react-dom": "https://esm.sh/react-dom@19.0.0?deps=react@19.0.0",
          "react-dom/client": "https://esm.sh/react-dom@19.0.0/client?deps=react@19.0.0",
          "react/jsx-runtime": "https://esm.sh/react@19.0.0/jsx-runtime",
          "morphdom": "https://esm.sh/morphdom@2.7.8",
          "@modelcontextprotocol/ext-apps": "https://esm.sh/@modelcontextprotocol/ext-apps@0.4.0?deps=react@19.0.0",
          "@modelcontextprotocol/ext-apps/react": "https://esm.sh/@modelcontextprotocol/ext-apps@0.4.0/react?deps=react@19.0.0",
        },
      },
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
