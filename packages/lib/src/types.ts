import { Task } from "./task"
type SerializablePropertyKey = string | number
type Func = (...args: any[]) => any
type Primitive = string | number | boolean
type BaseType<T> = [T] extends [unknown]
  ? T extends string
    ? string
    : T extends number
    ? number
    : T extends boolean
    ? boolean
    : T extends Array<Primitive>
    ? BaseType<T[number]>[]
    : T extends Record<SerializablePropertyKey, unknown>
    ? { [K in keyof T]: BaseType<T[K]> } & Record<
        SerializablePropertyKey,
        unknown
      >
    : T
  : never

type Head<T extends readonly unknown[]> = T[0]
type Tail<T extends readonly unknown[]> = T extends readonly [
  infer _Head,
  ...infer Rest
]
  ? Rest
  : readonly []

export type GenericArguments<
  T extends readonly unknown[],
  Output extends readonly unknown[] = []
> = T extends readonly []
  ? Output
  : GenericArguments<Tail<T>, [...Output, BaseType<Head<T>>]>

export interface IProcMap {
  [key: string]: Func | Task<readonly unknown[], any, any> | IProcMap
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
  : Promise<T> & {
      onProgress: (cb: (percent: number) => void) => ProcedurePromise<T>
    }

// export type ProcedurePromise<T> = Promise<T> & {
//   onProgress: (cb: (percent: number) => void) => ProcedurePromise<T>
// } & T extends Generator<infer YieldResult, infer Return, infer Input>
//   ? {
//       onYield: (cb: (value: YieldResult) => Input) => Promise<Return>
//     }
//   : never

export type WorkerParentMessage = {
  id: string
  path: string
  args: unknown[]
  yield?: unknown
  result?: unknown
}

type InferredClientProc<T> = T extends Task<any, any, infer E>
  ? () => E extends ProcedurePromise<any> ? E : ProcedurePromise<E>
  : T extends Func
  ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>>
  : T extends IProcMap
  ? {
      [K in keyof T]: InferredClientProc<T[K]>
    }
  : never
