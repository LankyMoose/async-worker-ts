import type { Task } from "./task"
import type { FileHandle } from "node:fs/promises"
import type { AWTTransferable } from "./transferable"
import type { X509Certificate } from "node:crypto"

type Func = (...args: any[]) => any
type InferredPromiseValue<T> = T extends Promise<infer U> ? U : T
type AWTParameters<Arr extends readonly unknown[]> = Arr extends readonly []
  ? []
  : Arr extends readonly [infer Head, ...infer Tail]
  ? [
      Head extends AnyTransferable ? AWTTransferable<Head> : Head,
      ...AWTParameters<Tail>
    ]
  : Arr

export type AnyTransferable =
  | OffscreenCanvas
  | ImageBitmap
  | MessagePort
  | ReadableStream
  | WritableStream
  | TransformStream
  | VideoFrame
  | ArrayBuffer
  | ArrayBuffer
  | MessagePort
  | FileHandle
  | X509Certificate
  | Blob

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

export type TaskPromise<T> = Promise<T> & {
  on: (
    event: string,
    callback: (data?: any) => unknown
  ) => TaskPromise<InferredPromiseValue<T>>
}

export type WorkerMessage = {
  // unique id for this message, used to match up responses
  id: string
  // path to procedure, e.g. "foo.bar.baz" - only exists on procedure or task calls.
  path: string
  args: unknown[]
  // identifies a task, as opposed to a procedure - tasks have a uniquely bound scope.
  isTask: boolean
  // generator proxied events
  next?: unknown
  return?: unknown
  throw?: unknown
}

type InferredClientProc<T> = T extends Task<infer Args, infer E>
  ? (
      ...args: AWTParameters<Args>
    ) => E extends TaskPromise<any> ? E : TaskPromise<InferredPromiseValue<E>>
  : T extends Func
  ? (
      ...args: AWTParameters<Parameters<T>>
    ) => Promise<InferredPromiseValue<ReturnType<T>>>
  : T extends IProcMap
  ? {
      [K in keyof T]: InferredClientProc<T[K]>
    }
  : never
