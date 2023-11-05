import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, PromiseFunc } from "./types.js"
import type WorkerThreads from "worker_threads"

type NodeWorker = WorkerThreads.Worker
type NodeWorkerCtor = typeof WorkerThreads.Worker
type WorkerCtor = typeof Worker
type NodeTransferable = WorkerThreads.TransferListItem

const isNodeEnv = typeof process !== "undefined" && process.versions.node

function serializeProcMap(map: IProcMap): ISerializedProcMap {
  return Object.entries(map).reduce(
    (acc, [key, value]) =>
      Object.assign(acc, {
        [key]:
          typeof value === "function" || value instanceof Task
            ? value.toString()
            : serializeProcMap(value),
      }),
    {} as Record<string, string>
  )
}

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined

  constructor(procMap: IProcMap) {
    this.serializedProcMap = serializeProcMap(procMap)
  }

  public async exit(): Promise<void> {
    if (this.worker) await this.worker.terminate()
    this.worker = undefined
  }

  public call<U extends PromiseFunc>(
    path: string,
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
      w.postMessage({ id, path, args })
    })
  }

  private async getWorker(): Promise<OmniWorker> {
    if (!this.worker) {
      this.worker = await OmniWorker.new(this.serializedProcMap)
    }
    return this.worker
  }
}

class OmniWorker {
  private worker: (Worker | NodeWorker) | undefined = undefined

  constructor(ctor: WorkerCtor | NodeWorkerCtor, workerData: any) {
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

  public postMessage(
    message: any,
    transfer?: Transferable[] | NodeTransferable[] | undefined
  ): void {
    if (!this.worker) return
    if (isNodeEnv) {
      ;(this.worker as NodeWorker).postMessage(
        message,
        transfer as NodeTransferable[]
      )
      return
    }
    ;(this.worker as Worker).postMessage(message, transfer as Transferable[])
  }

  public async terminate(): Promise<void> {
    if (!this.worker) return
    if (isNodeEnv) (this.worker as NodeWorker).unref()
    await this.worker.terminate()
    this.worker = undefined
  }

  public addEventListener<K extends keyof WorkerEventMap>(
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

  public removeEventListener<K extends keyof WorkerEventMap>(
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
