import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, ProcedurePromise } from "./types.js"

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined
  private completionCallbacks: { [taskId: string]: (() => void)[] } = {}

  constructor(procMap: IProcMap) {
    this.serializedProcMap = serializeProcMap(procMap)
  }

  public call(path: string, ...args: unknown[]): ProcedurePromise<unknown> {
    const taskId = Math.random().toString(36).slice(2)
    const wp = this.getWorker()

    const promise = new Promise(async (resolve, reject) => {
      const worker = await wp
      const handler = (event: MessageEvent) => {
        if ("progress" in event.data) return

        const { id: responseId, result, error } = event.data
        if (responseId === taskId) {
          worker.removeEventListener("message", handler)
          if (this.completionCallbacks[taskId]) {
            this.completionCallbacks[taskId].forEach((cb) => cb())
            delete this.completionCallbacks[taskId]
          }

          return error ? reject(error) : resolve(result)
        }
      }
      worker.addEventListener("message", handler)
      worker.postMessage({ id: taskId, path, args })
    }) as Partial<ProcedurePromise<unknown>>

    return Object.assign(promise, {
      onProgress: (cb: (percent: number) => void) => {
        const progressHandler = async (event: MessageEvent) => {
          if (!("progress" in event.data)) return
          const { id, progress } = event.data
          if (id !== taskId) return
          cb(progress)
        }

        wp.then((worker) => {
          worker.addEventListener("message", progressHandler)
          if (!this.completionCallbacks[taskId])
            this.completionCallbacks[taskId] = []

          this.completionCallbacks[taskId].push(() =>
            worker.removeEventListener("message", progressHandler)
          )
        })
        return promise
      },
    }) as ProcedurePromise<unknown>
  }

  private async getWorker(): Promise<OmniWorker> {
    if (!this.worker) {
      this.worker = await OmniWorker.new(this.serializedProcMap)
    }
    return this.worker
  }

  public async exit(): Promise<void> {
    if (this.worker) await this.worker.terminate()
    this.worker = undefined
  }
}

function serializeProcMap(map: IProcMap): ISerializedProcMap {
  return Object.entries(map).reduce(
    (acc, [key, value]) =>
      Object.assign(acc, {
        [key]:
          typeof value === "function"
            ? value.toString()
            : value instanceof Task
            ? value.fn.toString()
            : serializeProcMap(value),
      }),
    {}
  )
}
