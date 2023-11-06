import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, PromiseFunc } from "./types.js"

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined

  constructor(procMap: IProcMap) {
    this.serializedProcMap = serializeProcMap(procMap)
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
