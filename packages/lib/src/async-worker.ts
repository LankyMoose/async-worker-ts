import { Task } from "./task.js"
import type { IProcMap, PromiseFunc } from "./types.js"

const isNodeEnv = typeof process !== "undefined" && process.versions.node

export class AsyncWorker<T extends IProcMap> {
  private serializedProcMap: Record<string, string>
  private worker: OmniWorker | undefined = undefined

  constructor(procMap: T) {
    this.serializedProcMap = Object.entries(procMap).reduce(
      (acc, [key, value]) => {
        acc[key] = value instanceof Task ? value.serialize() : value.toString()
        return acc
      },
      {} as Record<string, string>
    )
  }

  async exit(): Promise<void> {
    if (this.worker) await this.worker?.terminate()
    this.worker = undefined
  }

  async getWorker(): Promise<OmniWorker> {
    if (!this.worker) {
      this.worker = await OmniWorker.new(this.serializedProcMap)
    }
    return this.worker
  }

  call<K extends keyof T, U extends PromiseFunc>(
    key: K,
    ...args: Parameters<U>
  ): Promise<ReturnType<U>> {
    return new Promise(async (resolve, reject) => {
      const w = await this.getWorker()
      const id = Math.random().toString(36).slice(2)

      const handler = async (event: MessageEvent) => {
        const { id: responseId, result, error } = event.data
        if (responseId === id) {
          w.removeEventListener("message", handler)
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      }
      w.addEventListener("message", handler)
      w.postMessage({ id, key, args })
    })
  }
}

type NodeWorker = import("worker_threads").Worker
type SomeWorker = NodeWorker | Worker

class OmniWorker {
  private worker: SomeWorker | undefined = undefined

  constructor(
    ctor: typeof Worker | typeof import("worker_threads").Worker,
    workerData: any
  ) {
    this.worker = new ctor(
      new URL(isNodeEnv ? "./worker.node.js" : "./worker.js", import.meta.url),
      { workerData }
    )
  }

  static async new(workerData: any): Promise<OmniWorker> {
    return new Promise(async (resolve) => {
      const worker = new OmniWorker(
        isNodeEnv ? (await import("worker_threads")).Worker : Worker,
        workerData
      )

      if (isNodeEnv) return resolve(worker)

      const connectHandler = async (e: MessageEvent) => {
        if (e.data === "initialized") {
          worker.removeEventListener("message", connectHandler)
          resolve(worker)
        }
      }
      worker.addEventListener("message", connectHandler)
      worker.postMessage(workerData)
    })
  }

  postMessage(
    message: any,
    transfer?:
      | Transferable[]
      | import("worker_threads").TransferListItem[]
      | undefined
  ): void {
    if (!this.worker) return
    if (isNodeEnv) {
      ;(this.worker as NodeWorker).postMessage(
        message,
        transfer as import("worker_threads").TransferListItem[]
      )
      return
    }
    ;(this.worker as Worker).postMessage(message, transfer as Transferable[])
  }

  async terminate(): Promise<void> {
    if (!this.worker) return
    if (isNodeEnv) (this.worker as NodeWorker).unref()
    await this.worker.terminate()
    this.worker = undefined
  }

  addEventListener<K extends keyof WorkerEventMap>(
    event: K,
    listener: (ev: WorkerEventMap[K]) => any
  ): void {
    if (!this.worker) return
    if (isNodeEnv) {
      ;(this.worker as NodeWorker).on(event, listener)
      return
    }
    ;(this.worker as Worker).addEventListener(event, listener)
  }

  removeEventListener<K extends keyof WorkerEventMap>(
    event: K,
    listener: (ev: WorkerEventMap[K]) => any
  ): void {
    if (!this.worker) return
    if (isNodeEnv) {
      ;(this.worker as NodeWorker).off(event, listener)
      return
    }
    ;(this.worker as Worker).removeEventListener(event, listener)
  }
}
