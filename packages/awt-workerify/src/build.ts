#!/usr/bin/env node
import path from "node:path"
import fs from "node:fs/promises"
import esbuild, { TransformOptions, type BuildOptions } from "esbuild"
import { gen } from "./codegen.js"
import { log } from "./logger.js"

const envVars = {
  "process.env.NODE_ENV": !!process.argv.find((arg) => arg === "--prod")
    ? '"production"'
    : '"development"',
}

const cwd = process.cwd()
// const packageDir = path.resolve(
//   cwd,
//   path.join("node_modules", "async-worker-ts", "dist")
// )

// if entry path is a file, use its directory - otherwise use the entry path

const tsconfig = path.join(cwd, "tsconfig.json")
// check if tsconfig exists
const exists = await fs.stat(tsconfig).catch(() => false)
const tsconfigRaw = exists ? await fs.readFile(tsconfig, "utf8") : "{}"

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

async function buildWorker(_path: string, distPath: string) {
  let src = await fs.readFile(_path, "utf8")
  if (!src) throw new Error("no source")
  const res = await esbuild.transform(src, {
    sourcefile: _path,
    format: "esm",
    loader: "ts",
    platform: !!process.argv.find((arg) => arg === "--browser" || arg === "-b")
      ? "node"
      : "browser",
    tsconfigRaw,
  } as TransformOptions)
  src = res.code

  const codeGenRes = gen(src, _path)
  const dir = path.dirname(_path)

  await fs.writeFile(
    path.join(dir, codeGenRes.id + ".client.js"),
    codeGenRes.client
  )

  const fName = path.basename(_path)
  const outfile = path.join(distPath, fName.replace(".ts", ".js"))

  await Promise.all([
    esbuild.build({
      ...buildOptions,
      entryPoints: [path.join(dir, codeGenRes.id + ".client.js")],
      outfile,
    }),
    esbuild.build({
      ...buildOptions,
      entryPoints: [_path],
      outfile: path.join(distPath, codeGenRes.id + ".awt.js"),
    }),
  ])

  await fs.unlink(path.join(dir, codeGenRes.id + ".client.js"))

  return codeGenRes.id
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
  // await esbuild.build({
  //   ...buildOptions,
  //   entryPoints: [path.resolve(packageDir, "worker.js")],
  //   outdir: distPath,
  // })

  const ids: string[] = await build_recursive(srcPath, distPath)

  // recurse through the dist directory and delete all the files that end in .worker.js
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
