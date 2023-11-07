import { Task } from "./task"

export type Func = (...args: any[]) => any

type WorkerProcedure = Func | Task<readonly unknown[], any[], any>

export interface IProcMap {
  [key: string]: WorkerProcedure | IProcMap
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
  onProgress: (cb: (percent: number) => void) => ProcedurePromise<T>
}

export type WorkerParentMessage = {
  id: string
  path: string
  args: unknown[]
}

type InferredClientProc<T> = T extends Func
  ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>>
  : T extends Task<any, any, infer E>
  ? () => E extends ProcedurePromise<any> ? E : ProcedurePromise<E>
  : T extends IProcMap
  ? {
      [K in keyof T]: InferredClientProc<T[K]>
    }
  : never
