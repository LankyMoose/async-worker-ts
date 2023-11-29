import path from "node:path"
import { build } from "./build.js"
import { log, log_err } from "./logger.js"

const cwd = process.cwd()

const _path = process.argv[2]
const entryPath = path.resolve(cwd, _path)
const entryDir = path.extname(_path) ? path.dirname(entryPath) : entryPath

const _dist = process.argv[3]
const distPath = path.resolve(cwd, _dist)

await build(entryDir, distPath)
  .catch((err) => {
    log_err("FgRed", "error building workers", err)
    process.exit(1)
  })
  .then((n) => {
    log("FgBlue", `build complete: built ${n} workers ✅`)
    process.exit(0)
  })
