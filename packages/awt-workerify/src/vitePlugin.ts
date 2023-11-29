import { build } from "./build.js"

export default function vitePlugin(outDir: string) {
  return {
    name: "awt-vite-plugin",
    enforce: "pre" as const,
    transform: async (src: string, srcPath: string) => {
      if (srcPath.endsWith(".worker.ts")) {
        await build(srcPath, outDir)
        return {
          code: "",
          map: null,
        }
      }
      return {
        code: src,
        map: null,
      }
    },
    writeBundle: () => {
      console.log("awt-vite-plugin: writeBundle")
    },
  }
}
