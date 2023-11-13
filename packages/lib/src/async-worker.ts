import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap, ProcedurePromise } from "./types.js"

export class AsyncWorker {
  private serializedProcMap: ISerializedProcMap
  private worker: OmniWorker | undefined = undefined
  private completionCallbacks: { [taskId: string]: (() => void)[] } = {}

  constructor(procMap: IProcMap) {
    this.serializedProcMap = this.serializeProcMap(procMap)
  }

  public exec(path: string, isTask: boolean, ...args: unknown[]) {
    const taskId = crypto.randomUUID()
    const wp = this.getWorker()

    const promise = new Promise(async (resolve, reject) => {
      const worker = await wp
      const handler = (event: MessageEvent) => {
        const { id, result, error, generator } = event.data
        if (id !== taskId) return
        if (
          !("result" in event.data) &&
          !("error" in event.data) &&
          !("generator" in event.data)
        )
          return

        worker.removeEventListener("message", handler)

        if (generator)
          return resolve(this.createGenerator(worker, taskId, args))

        this.onTaskComplete(taskId)
        return error ? reject(error) : resolve(result)
      }
      worker.addEventListener("message", handler)
      worker.postMessage({ id: taskId, path, args, isTask })
    }) as Partial<ProcedurePromise<unknown>>

    return this.extendPromise(promise, wp, taskId)
  }

  public exit() {
    if (this.worker) this.worker.terminate()
    this.worker = undefined
  }

  private extendPromise(
    promise: Partial<ProcedurePromise<unknown>>,
    wp: Promise<OmniWorker>,
    taskId: string
  ) {
    return Object.assign(promise, {
      on: async (event: string, callback: (data?: any) => any) => {
        const emitHandler = async (e: MessageEvent) => {
          if (!("event" in e.data)) return
          const { id: msgId, event: taskEvent, data } = e.data
          if (taskEvent !== event) return
          const res = callback(data)
          if (res instanceof Promise) await res
          wp.then(async (w) => w.postMessage({ id: msgId, data: res }))
        }

        wp.then((worker) => {
          worker.addEventListener("message", emitHandler)
          if (!this.completionCallbacks[taskId])
            this.completionCallbacks[taskId] = []

          this.completionCallbacks[taskId].push(() =>
            worker.removeEventListener("message", emitHandler)
          )
        })

        return promise as ProcedurePromise<unknown>
      },
    }) as ProcedurePromise<unknown>
  }

  private createGenerator(
    worker: OmniWorker,
    taskId: string,
    ...args: unknown[]
  ) {
    const _this = this
    return Object.assign(
      (async function* (...next: any[]) {
        while (true) {
          const { value, done } = await _this.createGeneratorTx(
            worker,
            taskId,
            "next",
            next
          )

          if (done) return value
          next = yield value
        }
      })(...args),
      {
        return: (value: any) =>
          this.createGeneratorTx(worker, taskId, "return", value),
        throw: (error: any) =>
          this.createGeneratorTx(worker, taskId, "throw", error),
      }
    ) as AsyncGenerator<any, any, any>
  }

  private createGeneratorTx(
    worker: OmniWorker,
    taskId: string,
    key: string,
    ...args: any[]
  ) {
    return new Promise<any>(async (res) => {
      const handler = (event: MessageEvent) => {
        if (!(key in event.data)) return
        const { id: responseId, [key]: value, done } = event.data

        if (responseId !== taskId) return
        worker.removeEventListener("message", handler)
        res({ value, done })
      }

      if (args && args.length > 0) await Promise.all(args)
      worker.addEventListener("message", handler)
      worker.postMessage({ id: taskId, [key]: args })
    })
  }

  private async getWorker() {
    return (this.worker =
      this.worker ?? (await OmniWorker.new(this.serializedProcMap)))
  }

  private onTaskComplete(taskId: string) {
    if (this.completionCallbacks[taskId]) {
      this.completionCallbacks[taskId].forEach((cb) => cb())
      delete this.completionCallbacks[taskId]
    }
    return true
  }

  private serializeProcMap(map: IProcMap): ISerializedProcMap {
    return Object.entries(map).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          [key]:
            typeof value === "function"
              ? value.toString()
              : value instanceof Task
              ? Task.getTaskFn(value).toString()
              : this.serializeProcMap(value),
        }),
      {}
    )
  }
}
