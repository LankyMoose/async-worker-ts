import type { IProcMap, ISerializedProcMap, WorkerParentMessage } from "./types"

let didInit = false
let procMap: IProcMap = {}

onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }

  const { id, path, args } = e.data as WorkerParentMessage

  let scope = procMap
  if (path.includes(".")) {
    const keys = path.split(".")
    keys.pop()
    // @ts-ignore
    scope = keys.reduce((acc, key) => acc[key], procMap)
  }

  try {
    // @ts-expect-error
    globalThis.reportProgress = (progress: number) =>
      postMessage({ id, progress })

    const fn = getProc(path).bind(scope)
    const toStringTag = (fn as any)[Symbol.toStringTag]
    const isGenerator = toStringTag?.endsWith("GeneratorFunction")

    if (isGenerator) {
      const gen = await fn(...args)
      let result = await gen.next()

      while (!result.done) {
        postMessage({ id, progress: await resolveGeneratorValue(result.value) })
        result = await gen.next()
      }

      postMessage({ id, result: await resolveGeneratorValue(result.value) })
      return
    }

    const result = await fn(...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}

async function resolveGeneratorValue(value: any) {
  if (value instanceof Promise) return await value
  return value
}

function getProc(path: string) {
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

function deserializeProcMap(procMap: ISerializedProcMap) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === "string" ? parseFunc(value) : deserializeProcMap(value)
    return acc
  }, {} as IProcMap)
}
// prettier-ignore
function parseFunc(str: string): (...args: any[]) => any {
  const unnamedFunc = "function("
  const unnamedGeneratorFunc = "function*("
  const unnamedAsyncFunc = "async function("
  const unnamedAsyncGeneratorFunc = "async function*("

  // trim and replace to normalize whitespace
  str = str.trim()
  const fn_name_internal = "___thunk___"

  if (str.startsWith("function (")) str = str.replace("function (", unnamedFunc)
  if (str.startsWith("async function (")) str = str.replace("async function (", unnamedAsyncFunc)
  if (str.startsWith("function *(")) str = str.replace("function *(", unnamedGeneratorFunc)
  if (str.startsWith("async function *(")) str = str.replace("async function *(", unnamedAsyncGeneratorFunc)


  // if it's an unnamed function, add a name so we can eval it
  if (str.startsWith(unnamedFunc)) {
    return eval(`(${str.replace(unnamedFunc, `function ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedAsyncFunc)) {
    return eval(`(${str.replace(unnamedAsyncFunc, `async function ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedGeneratorFunc)) {
    return eval(`(${str.replace(unnamedGeneratorFunc, `function* ${fn_name_internal}(`)})`)
  } else if (str.startsWith(unnamedAsyncGeneratorFunc)) {
    return eval(`(${str.replace(unnamedAsyncGeneratorFunc, `async function* ${fn_name_internal}(`)})`)
  }

  return eval(`(${str})`)
}
