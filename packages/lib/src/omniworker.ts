import type WorkerThreads from "worker_threads"

type NodeWorker = WorkerThreads.Worker
type NodeWorkerCtor = typeof WorkerThreads.Worker
type WorkerCtor = typeof Worker
type NodeTransferable = WorkerThreads.TransferListItem

const isNodeEnv = typeof process !== "undefined" && process.versions.node

export class OmniWorker {
  private worker: (Worker | NodeWorker) | undefined = undefined

  constructor(
    ctor: WorkerCtor | NodeWorkerCtor,
    workerData: any,
    maxListeners: number = 256
  ) {
    this.worker = new ctor(
      new URL(isNodeEnv ? "./worker.node.js" : "./worker.js", import.meta.url),
      {
        workerData,
        type: "module",
      }
    )
    if (isNodeEnv) (this.worker as NodeWorker).setMaxListeners(maxListeners)
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

  public async terminate(): Promise<void> {
    if (!this.worker) return
    if (isNodeEnv) (this.worker as NodeWorker).unref()
    await this.worker.terminate()
    this.worker = undefined
  }
}
