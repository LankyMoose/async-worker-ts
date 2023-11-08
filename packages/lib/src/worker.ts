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

    const result = await getProc(path).bind(scope)(...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
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

function parseFunc(str: string): (...args: any[]) => any {
  str = str.trim()
  if (str.startsWith("function"))
    str = str.replace("function", "async function")

  const fn_name_default = "___awt_thunk___"
  if (str.startsWith("async function (")) {
    return eval(
      `(${str.replace(
        "async function (",
        `async function ${fn_name_default}(`
      )})`
    )
  } else if (str.startsWith("async function *(")) {
    return eval(
      `(${str.replace(
        "async function *(",
        `async function* ${fn_name_default}(`
      )})`
    )
  }

  return eval(`(${str})`)
}
