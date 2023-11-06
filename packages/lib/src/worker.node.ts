import {
  isMainThread,
  workerData,
  parentPort,
  MessagePort,
} from "node:worker_threads"
import type { IProcMap, ISerializedProcMap } from "./types"

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  parentPort.on("message", async ({ id, path, args }) => {
    const pp = parentPort as MessagePort
    try {
      // @ts-expect-error
      globalThis.reportProgress = (progress: number) =>
        pp.postMessage({ data: { id, progress } })

      const result = await getProc(path)(...args)
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
      typeof value === "string" ? eval(value) : deserializeProcMap(value)
    return acc
  }, {} as IProcMap)
}
