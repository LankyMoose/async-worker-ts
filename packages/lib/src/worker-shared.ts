import { IProcMap, ISerializedProcMap } from "./types"

export const AWT_DEBUG_GENERATED_SRC = false

export function customGenerator(sourceCode: string) {
  const yieldRegex = /yield\s+([^;\n]+)(?=[;\n])/g // Regex to find 'yield' statements
  let newSrc = transformFunc(sourceCode)
  if (newSrc.substring(0, "async ".length) !== "async ") {
    newSrc = `async ${newSrc}`
  }
  if (newSrc.startsWith("async function*")) {
    newSrc = newSrc.replace("async function*", "async function")
  }
  let match
  while ((match = yieldRegex.exec(newSrc)) !== null) {
    // Extract values from the 'yield' statements
    const offset = match.index
    const len = match[0].length
    const value = match[1]

    newSrc =
      newSrc.slice(0, offset) +
      `await _____yield(${value})` +
      newSrc.slice(offset + len, newSrc.length)
  }

  return newSrc
}
export function getProc(procMap: IProcMap, path: string) {
  const keys = path.split(".") as string[]
  let map = procMap as any

  while (keys.length) {
    const k = keys.shift()!
    if (!map[k]) throw new Error(`No procedure found: "${path}"`)
    map = map[k]
    if (typeof map === "function") return map as { (...args: any): any }
  }

  throw new Error(`No procedure found: "${path}"`)
}
export function deserializeProcMap(procMap: ISerializedProcMap) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === "string" ? parseFunc(value) : deserializeProcMap(value)
    return acc
  }, {} as IProcMap)
}
export function parseFunc(str: string): (...args: any[]) => any {
  const transformed = transformFunc(str)
  return eval(`(${transformed})`)
}
export function transformFunc(str: string) {
  str = str.trim()

  const fn_name_internal = "___thunk___"
  let isGenerator = false

  if (str.startsWith("function (")) {
    str = str.replace("function (", `function ${fn_name_internal}(`)
  } else if (str.startsWith("async function (")) {
    str = str.replace("async function (", `async function ${fn_name_internal}(`)
  } else if (str.startsWith("function* (")) {
    str = str.replace("function* (", `function* ${fn_name_internal}(`)
    isGenerator = true
  } else if (str.startsWith("async function* (")) {
    str = str.replace(
      "async function* (",
      `async function* ${fn_name_internal}(`
    )
    isGenerator = true
  }

  if (isGenerator) str = customGenerator(str)
  if (AWT_DEBUG_GENERATED_SRC) console.debug(str)

  return str
}
export function getProcMapScope(procMap: IProcMap, path: string) {
  const keys = path.split(".")
  keys.pop()
  // @ts-ignore
  return keys.reduce((acc, key) => acc[key], procMap) as IProcMap
}
