import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, ProcedurePromise } from "./types.js"

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined

  constructor(procMap: IProcMap) {
    this.serializedProcMap = serializeProcMap(procMap)
  }

  public call(
    taskId: string,
    path: string,
    ...args: unknown[]
  ): ProcedurePromise<unknown> {
    const w = this.getWorker()
    const promise = new Promise(async (resolve, reject) => {
      const handler = async (event: MessageEvent) => {
        const { id: responseId, result, error, progress } = event.data
        if (progress !== undefined) return
        if (responseId === taskId) {
          ;(await w).removeEventListener("message", handler)
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        }
      }
      ;(await w).addEventListener("message", handler)
      ;(await w).postMessage({ id: taskId, path, args })
    })

    return Object.assign(promise, {
      onProgress: async (cb: (percent: number) => void) => {
        ;(await w).addEventListener("message", async (event: MessageEvent) => {
          const { id, progress } = event.data
          if (progress === undefined) return
          if (id !== taskId) return
          cb(progress)
        })
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
