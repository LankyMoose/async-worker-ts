#!/usr/bin/env node
import path from "node:path"
import fs from "node:fs/promises"
import esbuild, { TransformOptions, type BuildOptions } from "esbuild"
import { gen } from "./codegen.js"
import { log, log_pref } from "./logger.js"

const envVars = {
  "process.env.NODE_ENV": !!process.argv.find((arg) => arg === "--prod")
    ? '"production"'
    : '"development"',
}

const cwd = process.cwd()
const tsconfig = path.join(cwd, "tsconfig.json")
const tscfgExists = await fs.stat(tsconfig).catch(() => false)
const tsconfigRaw = tscfgExists ? await fs.readFile(tsconfig, "utf8") : "{}"

const buildOptions: BuildOptions = {
  bundle: true,
  minify: true,
  format: "esm",
  target: "esnext",
  platform: "node",
  tsconfig,
  loader: { ".js": "js", ".ts": "ts" },
  allowOverwrite: true,
  define: { ...envVars },
}

async function buildWorker(srcFilePath: string, distPath: string) {
  let src = await fs.readFile(srcFilePath, "utf8")
  if (!src) throw new Error(`${log_pref}could not read file: ${srcFilePath}`)
  // transform the source to js, esm
  const res = await esbuild.transform(src, {
    sourcefile: srcFilePath,
    format: "esm",
    loader: "ts",
    platform: "node",
    tsconfigRaw,
  } as TransformOptions)
  src = res.code

  // generate the client code
  const { id, code } = gen(src, srcFilePath)
  const dir = path.dirname(srcFilePath)

  // write the client code to a temp file to use with esbuild
  await fs.writeFile(path.join(dir, id + ".temp.awt.js"), code)

  const fName = path.basename(srcFilePath)
  const outfile = path.join(distPath, fName.replace(".ts", ".js"))

  await Promise.all([
    // build the client code
    esbuild.build({
      ...buildOptions,
      entryPoints: [path.join(dir, id + ".temp.awt.js")],
      outfile,
    }),
    // build the worker code
    esbuild.build({
      ...buildOptions,
      entryPoints: [srcFilePath],
      outfile: path.join(distPath, id + ".awt.js"),
    }),
  ])

  // delete the temp file
  await fs.unlink(path.join(dir, id + ".temp.awt.js"))

  return id
}

async function build_recursive(
  _path: string,
  distPath: string,
  ids: string[] = []
) {
  const files = await fs.readdir(_path)

  for (const file of files) {
    const p = path.join(_path, file)
    const stat = await fs.stat(p)
    if (stat.isDirectory()) {
      await build_recursive(p, distPath, ids)
    } else if (p.endsWith(".worker.ts")) {
      log("FgBlue", `building worker: ${p}`)
      ids.push(await buildWorker(p, distPath))
    }
  }

  return ids
}

export async function build(srcPath: string, distPath: string) {
  const ids: string[] = await build_recursive(srcPath, distPath)

  // recurse through the dist directory and
  // delete all the files that end in .awt.js
  // if the file name is not in the ids array
  await deleteOldBuilds(ids, distPath)

  return ids.length
}

async function deleteOldBuilds(currentIds: string[], _path: string) {
  const distFiles = await fs.readdir(_path)
  for (const file of distFiles) {
    const p = path.join(_path, file)
    const stat = await fs.stat(p)
    if (stat.isDirectory()) {
      await deleteOldBuilds(currentIds, p)
    } else if (p.endsWith(".awt.js")) {
      const id = file.replace(".awt.js", "")
      if (!currentIds.includes(id)) {
        await fs.unlink(p)
      }
    }
  }
}
