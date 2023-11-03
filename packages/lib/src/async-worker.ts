import type { ProcMap } from "./types"

type NodeWorker = import("worker_threads").Worker
type SomeWorker = NodeWorker | Worker

export class AsyncWorker<T extends ProcMap> {
  private procMap: T
  private worker: SomeWorker | undefined = undefined
  private isNode = typeof window === "undefined"
  initialization: Promise<this> | undefined = undefined

  constructor(procMap: T) {
    this.procMap = procMap
    this.init()
  }

  serializeProcMap() {
    return Object.entries(this.procMap).reduce((acc, [key, value]) => {
      // @ts-ignore
      acc[key] = value.toString()
      return acc
    }, {} as Record<string, string>)
  }

  async init() {
    if (this.initialization) return this.initialization
    this.initialization = new Promise(async (resolve, reject) => {
      try {
        const ctor = this.isNode
          ? (await import("worker_threads")).Worker
          : Worker

        this.worker = new ctor(
          new URL(
            this.isNode ? "./worker.node.js" : "./worker.js",
            import.meta.url
          ),
          {
            workerData: this.serializeProcMap(),
          }
        ) as SomeWorker
        if (!this.isNode) {
          this.worker.postMessage(this.serializeProcMap())
          ;(this.worker as Worker).addEventListener("message", (e) => {
            if (e.data === "initialized") resolve(this)
          })
        } else {
          resolve(this)
        }
      } catch (error) {
        reject(error)
      }
    })
    return this
  }

  async getWorker() {
    if (!this.worker) {
      await this.init()
    }
    return this.worker as SomeWorker
  }

  call<K extends keyof T>(
    key: K,
    ...args: Parameters<T[K]>
  ): Promise<ReturnType<T[K]>> {
    return new Promise(async (resolve, reject) => {
      const w = await this.getWorker()
      const id = Math.random().toString(36).slice(2)

      const handler = async (event: MessageEvent) => {
        const { id: responseId, result, error } = event.data
        if (responseId === id) {
          removeEvtListener(w, handler)
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      }
      addEvtListener(w, handler)
      w.postMessage({ id, key, args })
    })
  }
}

function removeEvtListener(
  w: SomeWorker,
  handler: (event: MessageEvent) => Promise<void>
) {
  if ("window" in globalThis) {
    ;(w as Worker).removeEventListener("message", handler)
  } else {
    ;(w as NodeWorker).removeListener("message", handler)
  }
}

function addEvtListener(
  w: SomeWorker,
  handler: (event: MessageEvent) => Promise<void>
) {
  if ("window" in globalThis) {
    ;(w as Worker).addEventListener("message", handler)
  } else {
    ;(w as NodeWorker).on("message", handler)
  }
}
