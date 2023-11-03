#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import esprima from "esprima"
import { log } from "./logger.js"

console.log("compiler", process.argv)
if (!process.argv[2]) {
  throw new Error("must specify entry file")
}

const entry = path.join(process.cwd(), process.argv[2])
log("entry", entry)

const file = fs.readFileSync(entry, "utf-8")

//const tokens = esprima.tokenize(file, { loc: true })

//log("tokens", tokens)

const ast = esprima.parseModule(file, { loc: true })

//log("ast", ast)
log(ast.body[0])
