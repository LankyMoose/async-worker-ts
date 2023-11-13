import { Task } from "./task"

type Func = (...args: any[]) => any
type InferredPromiseValue<T> = T extends Promise<infer U> ? U : T

export interface IProcMap {
  [key: string]: Func | Task<readonly unknown[], any> | IProcMap
}

export interface ISerializedProcMap {
  [key: string]: string | ISerializedProcMap
}

export type AsyncWorkerClient<T extends IProcMap> = {
  [K in keyof T]: InferredClientProc<T[K]>
} & {
  concurrently: <E>(fn: (worker: AsyncWorkerClient<T>) => E) => Promise<E>
  exit: () => Promise<void>
}

export type ProcedurePromise<T> = Promise<T> & {
  on: (
    event: string,
    callback: (data?: any) => unknown
  ) => ProcedurePromise<InferredPromiseValue<T>>
}

export type WorkerMessage = {
  // unique id for this message, used to match up responses
  id: string
  // path to procedure, e.g. "foo.bar.baz" - only exists on procedure or task calls.
  path: string
  args: unknown[]
  // identifies a task, as opposed to a procedure - tasks have a uniquely bound scope.
  isTask?: boolean
  // generator proxied events
  next?: unknown
  return?: unknown
  throw?: unknown
}

type InferredClientProc<T> = T extends Task<infer Args, infer E>
  ? (
      ...args: Args
    ) => E extends ProcedurePromise<any>
      ? E
      : ProcedurePromise<InferredPromiseValue<E>>
  : T extends Func
  ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>>
  : T extends IProcMap
  ? {
      [K in keyof T]: InferredClientProc<T[K]>
    }
  : never
