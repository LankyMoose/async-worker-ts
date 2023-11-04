import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { IProcMap, UseWorkerResult } from "./types.js"

export default function useWorker<const T extends IProcMap>(procMap: T) {
  const worker = new AsyncWorker(procMap)
  return Object.entries(procMap).reduce(
    (acc, [key]) => {
      if (key === "exit") return acc
      if (procMap[key] instanceof Task) {
        return Object.assign(acc, {
          [key]: async () =>
            worker.call(
              key,
              ...(procMap[key] as Task<any[], any[], any>).getArgs()
            ),
        })
      }
      return Object.assign(acc, {
        [key]: async (...args: any[]) => worker.call(key, ...args),
      })
    },
    { exit: () => worker.deInit() } as UseWorkerResult<T>
  ) as UseWorkerResult<T>
}

export function task<const T extends readonly unknown[], U extends T, V>(
  fn: (...args: U) => V,
  args: T | (() => readonly [...T])
): Task<T, U, V> {
  return Object.assign(new Task<T, U, V>(fn, [] as unknown as T), {
    getArgs: () => (typeof args === "function" ? args() : args) as T,
  }) as Task<T, U, V>
}
