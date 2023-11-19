import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { AWTTransferable } from "./transferable.js"
import { IProcMap, AsyncWorkerClient, AnyTransferable } from "./types.js"

export default function <const T extends IProcMap>(procMap: T) {
  return createClient<T>(procMap)
}

export function task<const T extends readonly unknown[], U>(
  fn: (this: Task<any, any>, ...args: T) => U
): Task<T, U> {
  return new Task(fn)
}

export function transfer<T extends AnyTransferable>(value: T) {
  return new AWTTransferable(value)
}

function createClient<const T extends IProcMap>(
  map: IProcMap,
  worker = new AsyncWorker(map),
  path = ""
): AsyncWorkerClient<T> {
  return Object.entries(map).reduce(
    (acc, [k]) => {
      if (path === "" && (k === "exit" || k === "concurrently")) return acc

      const p = path ? path + "." + k : k
      const isTask = map[k] instanceof Task
      const isCallable = isTask || typeof map[k] === "function"
      if (isCallable) {
        return Object.assign(acc, {
          [k]: (...args: any[]) => worker.exec(p, isTask, ...args),
        })
      }

      return Object.assign(acc, {
        [k]: createClient(map[k] as IProcMap, worker, p),
      })
    },
    (path === ""
      ? {
          exit: () => worker.exit(),
          concurrently: async <E>(
            fn: (worker: AsyncWorkerClient<T>) => Promise<E>
          ) => {
            const client = createClient(map) as AsyncWorkerClient<T>
            const res = await fn(client)
            client.exit()
            return res
          },
        }
      : {}) as AsyncWorkerClient<T>
  )
}
