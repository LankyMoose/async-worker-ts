import { AsyncWorker } from "./async-worker.js"
import { ProcMap } from "./types.js"

export default function useWorker<const T extends ProcMap>(procMap: T) {
  const worker = new AsyncWorker(procMap)
  return Object.entries(procMap).reduce((acc, [key]) => {
    // @ts-ignore
    acc[key] = async (...args: any[]) => worker.call(key, ...args)
    return acc
  }, {} as T) as {
    [K in keyof T]: T[K]
  }
}
