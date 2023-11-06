import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { IProcMap, AsyncWorkerClient } from "./types.js"

// @ts-expect-error
export function reportProgress(percent: number): void {}

export default function <const T extends IProcMap>(procMap: T) {
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
  worker = new AsyncWorker(map),
  path = ""
): AsyncWorkerClient<T> {
  return Object.entries(map).reduce(
    (acc, [key]) => {
      if (key === "exit") return acc

      const p = !path ? key : path + "." + key

      if (map[key] instanceof Task) {
        return Object.assign(acc, {
          [key]: () =>
            worker.call(
              newId(),
              p,
              ...(map[key] as Task<any[], any[], any>).getArgs()
            ),
        })
      }

      if (typeof map[key] === "function") {
        return Object.assign(acc, {
          [key]: async (...args: any[]) => worker.call(newId(), p, ...args),
        })
      }

      return Object.assign(acc, {
        [key]: createClient(map[key] as IProcMap, worker, p),
      })
    },
    { exit: () => worker.exit() } as AsyncWorkerClient<T>
  )
}

function newId() {
  return Math.random().toString(36).slice(2)
}
