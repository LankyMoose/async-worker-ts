import { Task } from "./task"

export type PromiseFunc = (...args: any[]) => Promise<any>
export type Func = (...args: any[]) => any

type WorkerProcedure = PromiseFunc | Func | Task<readonly unknown[], any[], any>

export interface IProcMap {
  [key: string]: WorkerProcedure
}

export type AsyncWorkerClient<T extends IProcMap> = {
  [K in keyof T]: T[K] extends PromiseFunc | Func
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K] extends Task<any, any, infer E>
    ? () => E extends Promise<any> ? E : Promise<E>
    : never
} & {
  exit: () => Promise<void>
}
