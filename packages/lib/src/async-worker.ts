import type { ProcMap } from "./types"

type NodeWorker = import("worker_threads").Worker
type SomeWorker = NodeWorker | Worker

export class AsyncWorker<T extends ProcMap> {
  private serializedProcMap: Record<string, string>
  private worker: SomeWorker | undefined = undefined
  private isNode = typeof window === "undefined"
  initialization: Promise<this> | undefined = undefined

  constructor(procMap: T) {
    this.serializedProcMap = serializeProcMap(procMap)
    this.init()
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
            workerData: this.serializedProcMap,
          }
        ) as SomeWorker
        if (!this.isNode) {
          this.worker.postMessage(this.serializedProcMap)
          const connectHandler = async (e: MessageEvent) => {
            if (e.data === "initialized") {
              removeEvtListener(this.worker as Worker, connectHandler)
              resolve(this)
            }
          }
          addEvtListener(this.worker as Worker, connectHandler)
        } else {
          resolve(this)
        }
      } catch (error) {
        reject(error)
      }
    })
    return this
  }

  async deInit() {
    if (!this.worker) return
    await this.worker.terminate()
    this.worker = undefined
    this.initialization = undefined
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

function serializeProcMap<T extends ProcMap>(procMap: T) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    // @ts-ignore
    acc[key] = value.toString()
    return acc
  }, {} as Record<string, string>)
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
