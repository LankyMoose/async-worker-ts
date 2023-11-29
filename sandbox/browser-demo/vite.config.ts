import { defineConfig } from "vite"
import awtVitePlugin from "awt-workerify/dist/vitePlugin.js"

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  esbuild: {
    target: "esnext",
    supported: {
      "top-level-await": true,
    },
  },
  plugins: [awtVitePlugin("dist/assets")],
})
