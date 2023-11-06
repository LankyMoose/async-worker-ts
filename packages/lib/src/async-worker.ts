import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, ProcedurePromise } from "./types.js"

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined
  private completionCallbacks: { [taskId: string]: () => void } = {}

  constructor(procMap: IProcMap) {
    this.serializedProcMap = serializeProcMap(procMap)
  }

  public call(
    taskId: string,
    path: string,
    ...args: unknown[]
  ): ProcedurePromise<unknown> {
    const wp = this.getWorker()

    const promise = new Promise(async (resolve, reject) => {
      const worker = await wp
      const handler = async (event: MessageEvent) => {
        const { id: responseId, result, error, progress } = event.data
        if (progress !== undefined) return
        if (responseId === taskId) {
          worker.removeEventListener("message", handler)
          if (this.completionCallbacks[taskId]) {
            this.completionCallbacks[taskId]()
            delete this.completionCallbacks[taskId]
          }

          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      }
      worker.addEventListener("message", handler)
      worker.postMessage({ id: taskId, path, args })
    })

    return Object.assign(promise, {
      onProgress: async (cb: (percent: number) => void) => {
        const worker = await wp

        const progressHandler = async (event: MessageEvent) => {
          const { id, progress } = event.data
          if (progress === undefined) return
          if (id !== taskId) return
          cb(progress)
        }

        worker.addEventListener("message", progressHandler)
        this.completionCallbacks[taskId] = () => {
          worker.removeEventListener("message", progressHandler)
        }
        return promise
      },
    })
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
