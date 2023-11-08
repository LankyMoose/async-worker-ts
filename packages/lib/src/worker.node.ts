import {
  isMainThread,
  workerData,
  parentPort,
  MessagePort,
} from "node:worker_threads"
import type { IProcMap, ISerializedProcMap, WorkerParentMessage } from "./types"

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  parentPort.on("message", async ({ id, path, args }: WorkerParentMessage) => {
    let scope = procMap
    if (path.includes(".")) {
      const keys = path.split(".")
      keys.pop()
      // @ts-ignore
      scope = keys.reduce((acc, key) => acc[key], procMap)
    }

    const pp = parentPort as MessagePort
    try {
      // @ts-expect-error
      globalThis.reportProgress = (progress: number) =>
        pp.postMessage({ data: { id, progress } })

      const result = await getProc(path).bind(scope)(...args)
      pp.postMessage({ data: { id, result } })
    } catch (error) {
      pp.postMessage({ data: { id, error } })
    }
  })

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
