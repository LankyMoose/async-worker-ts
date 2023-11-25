#!/usr/bin/env node
import path from "node:path"
import { OutputOptions, rollup } from "rollup"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

const cwd = process.cwd()
const packageDir = path.resolve(
  cwd,
  path.join("node_modules", "async-worker-ts", "dist")
)

const _path = process.argv[2]
const entryPath = path.resolve(cwd, _path)

// if entry path is a file, use its directory
// otherwise use the entry path
const dir = path.extname(_path) ? path.dirname(entryPath) : entryPath

async function build() {
  /**
   * neither worker file is referenced in a way that rollup can find
   * so we need to manually include them
   */
  const [workersBundle, bundle] = await Promise.all([
    rollup({
      input: [
        path.resolve(packageDir, "worker.js"),
        path.resolve(packageDir, "worker.node.js"),
      ],
      plugins: [nodeResolve(), commonjs()],
    }),
    rollup({
      input: entryPath,
      plugins: [nodeResolve(), commonjs()],
    }),
  ])

  const writeOptions: OutputOptions = {
    chunkFileNames: "[name].js",
    format: "esm",
    dir,
  }

  await Promise.all([
    workersBundle.write(writeOptions),
    bundle.write(writeOptions),
  ])
}

build().catch(console.error)
