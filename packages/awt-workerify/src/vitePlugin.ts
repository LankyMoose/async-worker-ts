import fs from "node:fs"
import path from "node:path"
import esbuild, { BuildOptions, TransformOptions } from "esbuild"
import { gen } from "./codegen.js"

export default function vitePlugin(outDir: string) {
  const cwd = process.cwd()
  const distPath = path.resolve(cwd, outDir)

  const tsconfig = path.join(cwd, "tsconfig.json")
  let tsconfigRaw = "{}"
  try {
    tsconfigRaw = fs.readFileSync(tsconfig, "utf8")
  } catch (error) {}

  const generatedFiles = new Set<string>()

  return {
    name: "awt-vite-plugin",
    enforce: "pre" as const,
    transform: async (code: string, id: string) => {
      if (id.endsWith(".worker.ts")) {
        let src = code
        const res = await esbuild.transform(src, {
          sourcefile: id,
          format: "esm",
          loader: "ts",
          platform: "neutral",
          tsconfigRaw,
        } as TransformOptions)
        src = res.code

        const codeGenRes = gen(src, id)

        if (generatedFiles.has(codeGenRes.id)) return null
        generatedFiles.add(codeGenRes.id)

        const dir = path.dirname(id)
        fs.writeFileSync(
          path.join(dir, codeGenRes.id + ".client.js"),
          codeGenRes.client
        )

        const buildOptions: BuildOptions = {
          bundle: true,
          minify: true,
          format: "esm",
          target: "esnext",
          platform: "node",
          loader: { ".js": "js", ".ts": "ts" },
          allowOverwrite: true,
        }

        const fName = path.basename(id)
        const outfilePath = path.join(distPath, codeGenRes.id + ".awt.js")
        await Promise.all([
          esbuild.build({
            ...buildOptions,
            entryPoints: [path.join(dir, codeGenRes.id + ".client.js")],
            outfile: path.join(distPath, fName.replace(".ts", ".js")),
          }),
          esbuild.build({
            ...buildOptions,
            entryPoints: [id],
            outfile: outfilePath,
          }),
        ])

        console.log("awt-vite-plugin: writeFileSync", outfilePath)
        //console.log("awt-vite-plugin: buildRes", buildRes)

        fs.unlinkSync(path.join(dir, codeGenRes.id + ".client.js"))

        return {
          code: codeGenRes.client,
          map: null,
        }
      }
      return {
        code,
        map: null,
      }
    },
    writeBundle: () => {
      console.log("awt-vite-plugin: writeBundle")
    },
  }
}
