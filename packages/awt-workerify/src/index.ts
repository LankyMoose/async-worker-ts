#!/usr/bin/env node
import path from "node:path"
import fs from "node:fs/promises"
import esbuild, { type BuildOptions } from "esbuild"
import { gen } from "./codegen.js"
import { log, log_err } from "./logger.js"

const envVars = {
  "process.env.NODE_ENV": !!process.argv.find((arg) => arg === "--prod")
    ? '"production"'
    : '"development"',
}

const cwd = process.cwd()
const packageDir = path.resolve(
  cwd,
  path.join("node_modules", "async-worker-ts", "dist")
)

const _path = process.argv[2]
const entryPath = path.resolve(cwd, _path)
const _dist = process.argv[3]
const distPath = path.resolve(cwd, _dist)

// if entry path is a file, use its directory - otherwise use the entry path
const dir = path.extname(_path) ? path.dirname(entryPath) : entryPath

const buildOptions: BuildOptions = {
  bundle: true,
  minify: true,
  format: "esm",
  target: "esnext",
  platform: "node",
  allowOverwrite: true,
  define: { ...envVars },
}

async function buildWorker(_path: string) {
  const fName = path.basename(_path)
  const dir = path.dirname(_path)
  const outfile = path.join(distPath, fName.replace(".ts", ".js"))
  const src = await fs.readFile(_path, "utf8")
  const codeGenRes = gen(src, _path)

  await fs.writeFile(
    path.join(dir, codeGenRes.id + ".client.js"),
    codeGenRes.client
  )

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

async function build(_path: string, ids: string[] = [], isRoot = true) {
  await esbuild.build({
    ...buildOptions,
    entryPoints: [path.resolve(packageDir, "worker.js")],
    outdir: distPath,
  })

  const files = await fs.readdir(_path)

  for (const file of files) {
    const p = path.join(_path, file)
    const stat = await fs.stat(p)
    if (stat.isDirectory()) {
      await build(p, ids, false)
    } else if (p.endsWith(".worker.ts")) {
      log("FgBlue", `building worker: ${p}`)
      ids.push(await buildWorker(p))
    }
  }

  if (isRoot) {
    // recurse through the dist directory and delete all the files that end in .worker.js
    // if the file name is not in the ids array
    await deleteOldFiles(ids, distPath)
  }
  return ids.length
}

async function deleteOldFiles(currentIds: string[], _path: string) {
  const distFiles = await fs.readdir(_path)
  for (const file of distFiles) {
    const p = path.join(_path, file)
    const stat = await fs.stat(p)
    if (stat.isDirectory()) {
      await deleteOldFiles(currentIds, p)
    } else if (p.endsWith(".awt.js")) {
      const id = file.replace(".awt.js", "")
      if (!currentIds.includes(id)) {
        await fs.unlink(p)
      }
    }
  }
}

build(dir)
  .catch((err) => {
    log_err("FgRed", "error building workers", err)
    process.exit(1)
  })
  .then((n) => {
    log("FgBlue", `build complete: built ${n} workers ✅`)
    process.exit(0)
  })
