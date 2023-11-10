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
    const taskId = crypto.randomUUID()
    const wp = this.getWorker()

    const promise = new Promise(async (resolve, reject) => {
      const worker = await wp
      const handler = (event: MessageEvent) => {
        if (!("result" in event.data)) return

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
      yield: (genFunc: (args: any) => Generator | AsyncGenerator) => {
        let g: Generator | AsyncGenerator
        const yieldHandler = async (event: MessageEvent) => {
          if (!("yield" in event.data)) return
          const { id, yield: yieldValue } = event.data
          if (id !== taskId) return

          if (!g) g = genFunc(yieldValue)
          const gRes = await g.next(yieldValue)
          if (gRes.done) {
            wp.then((worker) => worker.postMessage({ id, result: gRes.value }))
          } else {
            wp.then((worker) => worker.postMessage({ id, yield: gRes.value }))
          }
        }

        wp.then((worker) => {
          worker.addEventListener("message", yieldHandler)
          if (!this.completionCallbacks[taskId])
            this.completionCallbacks[taskId] = []

          this.completionCallbacks[taskId].push(() =>
            worker.removeEventListener("message", yieldHandler)
          )
        })

        return promise
      },
      onYield: (cb: (value: unknown) => unknown) => {
        const yieldHandler = async (event: MessageEvent) => {
          if (!("yield" in event.data)) return
          const { id, yield: yieldValue } = event.data
          if (id !== taskId) return

          const result = await cb(yieldValue)
          wp.then((worker) => worker.postMessage({ id, yield: result }))
        }

        wp.then((worker) => {
          worker.addEventListener("message", yieldHandler)
          if (!this.completionCallbacks[taskId])
            this.completionCallbacks[taskId] = []

          this.completionCallbacks[taskId].push(() =>
            worker.removeEventListener("message", yieldHandler)
          )
        })

        return promise
      },
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
            ? Task.getTaskFn(value).toString()
            : serializeProcMap(value),
      }),
    {}
  )
}
