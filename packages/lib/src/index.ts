import { AsyncWorker } from "./async-worker.js"
import { ProcMap } from "./types.js"

type UseWorkerResult<T extends ProcMap> = {
  [K in keyof T]: T[K]
} & {
  deInit: () => Promise<void>
}

export default function useWorker<const T extends ProcMap>(procMap: T) {
  const worker = new AsyncWorker(procMap)
  return Object.entries(procMap).reduce(
    (acc, [key]) => {
      // @ts-ignore
      acc[key] = async (...args: any[]) => worker.call(key, ...args)
      return acc
    },
    { deInit: worker.deInit } as UseWorkerResult<T>
  ) as UseWorkerResult<T>
}
