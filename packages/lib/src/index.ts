import { AsyncWorker } from "./async-worker.js"
import { Task } from "./task.js"
import { AWTTransferable } from "./transferable.js"
import { IProcMap, AsyncWorkerClient, AnyTransferable } from "./types.js"
import { setProcMap } from "./worker.js"

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null

let isMainThread = false
if (isNode) {
  const { isMainThread: mt } = await import("node:worker_threads")
  isMainThread = mt
}

export default function <const T extends IProcMap>(
  procMap: T
): AsyncWorkerClient<T> {
  if (isNode && !isMainThread) {
    setProcMap(procMap)
    return {} as AsyncWorkerClient<T>
  }
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
  map: IProcMap
): AsyncWorkerClient<T> {
  const worker = new AsyncWorker(map)

  const recurseAssignProcedures = (
    map: IProcMap,
    path: string = ""
  ): AsyncWorkerClient<T> => {
    return Object.entries(map).reduce((acc, [k]) => {
      if (path === "" && (k === "exit" || k === "concurrently")) return acc

      const p = path ? `${path}.${k}` : k
      const entry = map[k]
      const isTask = entry instanceof Task
      const isCallable = entry instanceof Function || isTask

      if (isCallable) {
        return Object.assign(acc, {
          [k]: (...args: any[]) => worker.exec(p, ...args),
        })
      }

      return Object.assign(acc, {
        [k]: recurseAssignProcedures(entry, p),
      })
    }, {} as AsyncWorkerClient<T>)
  }

  const res = Object.assign(recurseAssignProcedures(map), {
    exit: () => worker.exit(),
    concurrently: async <E>(
      fn: (worker: AsyncWorkerClient<T>) => Promise<E>
    ) => {
      const client = createClient<T>(map)
      const res = await fn(client)
      client.exit()
      return res
    },
  })
  return res
}
