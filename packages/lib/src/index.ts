import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { IProcMap, AsyncWorkerClient } from "./types.js"

export default function useWorker<const T extends IProcMap>(procMap: T) {
  return createClient<T>(procMap)
}

export function task<const T extends readonly unknown[], U extends T, V>(
  fn: (...args: U) => V,
  args: T | (() => T)
): Task<T, U, V> {
  return new Task<T, U, V>(fn, args)
}

function createClient<const T extends IProcMap>(
  map: IProcMap,
  worker: AsyncWorker = new AsyncWorker(map),
  path: string = ""
): AsyncWorkerClient<T> {
  const joinPath = (a: string, b: string) =>
    a === "" ? b : b === "" ? a : a + "." + b

  return Object.entries(map).reduce(
    (acc, [key]) => {
      if (key === "exit") return acc
      if (map[key] instanceof Task) {
        return Object.assign(acc, {
          [key]: async () =>
            worker.call(
              joinPath(path, key),
              ...(map[key] as Task<any[], any[], any>).getArgs()
            ),
        })
      }

      if (typeof map[key] === "function") {
        return Object.assign(acc, {
          [key]: async (...args: any[]) =>
            worker.call(joinPath(path, key), ...args),
        })
      }

      return Object.assign(acc, {
        [key]: createClient(map[key] as IProcMap, worker, joinPath(path, key)),
      })
    },
    { exit: () => worker.exit() } as AsyncWorkerClient<T>
  )
}
