import { ITask, Task } from "./task"

type Func = (...args: any[]) => any

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

export type ProcedurePromise<T> = T extends Generator<
  infer YieldResult,
  infer Return,
  infer Input
>
  ? Promise<Return> & {
      onYield: (
        cb: (value: YieldResult) => Input | Promise<Input>
      ) => Promise<Return>
      yield: (cb: (args: YieldResult) => Generator) => ProcedurePromise<Return>
    }
  : Promise<T>

export type WorkerParentMessage = {
  id: string
  path: string
  args: unknown[]
  yield?: unknown
  result?: unknown
  isTask?: boolean
}

type InferredClientProc<T> = T extends ITask<infer Args, infer E>
  ? (...args: Args) => (E extends ProcedurePromise<any>
      ? E
      : ProcedurePromise<E>) & {
      onProgress: (cb: (percent: number) => void) => ProcedurePromise<T>
    }
  : T extends Func
  ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>>
  : T extends IProcMap
  ? {
      [K in keyof T]: InferredClientProc<T[K]>
    }
  : never
