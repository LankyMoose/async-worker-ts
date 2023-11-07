import { AsyncWorker } from "./async-worker.js"
import { ITask, Task } from "./task.js"
import { IProcMap, AsyncWorkerClient, GenericArguments } from "./types.js"

// @ts-expect-error
export function reportProgress(percent: number): void {}

export default function <const T extends IProcMap>(procMap: T) {
  return createClient<T>(procMap)
}

export function task<const T extends readonly unknown[], U extends T, V>(
  fn: (...args: GenericArguments<U>) => V,
  args: T | (() => T)
): ITask<T, GenericArguments<U>, V> {
  return new Task(fn, args) as ITask<T, GenericArguments<U>, V>
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
            worker.call(p, ...(map[key] as Task<any[], any, any>).getArgs()),
        })
      }

      if (typeof map[key] === "function") {
        return Object.assign(acc, {
          [key]: (...args: any[]) => worker.call(p, ...args),
        })
      }

      return Object.assign(acc, {
        [key]: createClient(map[key] as IProcMap, worker, p),
      })
    },
    {
      exit: () => worker.exit(),
      concurrently: async <E>(
        fn: (worker: AsyncWorkerClient<T>) => Promise<E>
      ) => {
        const w = createClient(map) as AsyncWorkerClient<T>
        const res = await fn(w)
        w.exit()
        return res
      },
    } as AsyncWorkerClient<T>
  )
}
