import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { IProcMap, AsyncWorkerClient } from "./types.js"

export default function <const T extends IProcMap>(procMap: T) {
  return createClient<T>(procMap)
}

export function task<const T extends readonly unknown[], U>(
  fn: (this: Task<any, any>, ...args: T) => U
): Task<T, U> {
  return new Task(fn)
}

function createClient<const T extends IProcMap>(
  map: IProcMap,
  worker = new AsyncWorker(map),
  path = ""
): AsyncWorkerClient<T> {
  return Object.entries(map).reduce(
    (acc, [k]) => {
      if (k === "exit") return acc

      const p = path ? path + "." + k : k

      const isCallable = map[k] instanceof Task || typeof map[k] === "function"
      if (isCallable) {
        return Object.assign(acc, {
          [k]: (...args: any[]) =>
            worker.exec(p, map[k] instanceof Task, ...args),
        })
      }

      return Object.assign(acc, {
        [k]: createClient(map[k] as IProcMap, worker, p),
      })
    },
    {
      exit: () => worker.exit(),
      concurrently: async <E>(
        fn: (worker: AsyncWorkerClient<T>) => Promise<E>
      ) => {
        const client = createClient(map) as AsyncWorkerClient<T>
        const res = await fn(client)
        client.exit()
        return res
      },
    } as AsyncWorkerClient<T>
  )
}
