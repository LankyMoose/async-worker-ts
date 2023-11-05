import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { IProcMap, AsyncWorkerClient } from "./types.js"

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
    { exit: () => worker.exit() }
  ) as AsyncWorkerClient<T>
}

export function task<const T extends readonly unknown[], U extends T, V>(
  fn: (...args: U) => V,
  args: T | (() => T)
): Task<T, U, V> {
  return new Task<T, U, V>(fn, args)
}
