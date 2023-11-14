import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import type { IProcMap, ISerializedProcMap } from "./types.js"

export class AsyncWorker {
  #procMap: IProcMap
  #serializedProcMap: ISerializedProcMap
  #worker: OmniWorker | undefined = undefined
  #completionCallbacks: { [taskId: string]: (() => void)[] } = {}

  constructor(procMap: IProcMap) {
    this.#procMap = procMap
    this.#serializedProcMap = this.#serializeProcMap(procMap)
  }

  async exec(path: string, isTask: boolean, ...args: unknown[]) {
    const id = crypto.randomUUID()
    const worker = await this.#getWorker()

    const promise = new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const { id: resId, result, error, generator } = event.data
        if (resId !== id) return
        if (
          !("result" in event.data) &&
          !("error" in event.data) &&
          !("generator" in event.data)
        )
          return

        worker.removeEventListener("message", handler)

        if (generator) return resolve(this.#createGenerator(worker, id, args))

        this.#onTaskComplete(id)
        return error ? reject(error) : resolve(result)
      }
      worker.addEventListener("message", handler)
      worker.postMessage({ id, path, args, isTask })
    })

    if (this.#isTask(path)) return this.#extendPromise(promise, worker, id)
    return promise
  }

  async exit() {
    await this.#worker?.terminate()
    this.#worker = undefined
  }

  #extendPromise(
    promise: Promise<unknown>,
    worker: OmniWorker,
    taskId: string
  ) {
    return Object.assign(promise, {
      on: (event: string, callback: (data?: unknown) => unknown) => {
        const emitHandler = async (e: MessageEvent) => {
          if (!("event" in e.data)) return
          const { id: msgId, event: taskEvent, data } = e.data
          if (taskEvent !== event) return
          const res = await callback(data)
          worker.postMessage({ id: msgId, data: res })
        }

        worker.addEventListener("message", emitHandler)
        if (!this.#completionCallbacks[taskId])
          this.#completionCallbacks[taskId] = []

        this.#completionCallbacks[taskId].push(() =>
          worker.removeEventListener("message", emitHandler)
        )

        return promise
      },
    })
  }

  #createGenerator(worker: OmniWorker, taskId: string, ...args: unknown[]) {
    const generateTx = this.#createGeneratorTx
    return Object.assign(
      (async function* (...next: unknown[]) {
        while (true) {
          const { value, done } = await generateTx(worker, taskId, "next", next)

          if (done) return value
          next = yield value
        }
      })(...args),
      {
        return: (value: unknown) => generateTx(worker, taskId, "return", value),
        throw: (error: unknown) => generateTx(worker, taskId, "throw", error),
      }
    ) as AsyncGenerator<unknown, unknown, unknown>
  }

  #createGeneratorTx(
    worker: OmniWorker,
    taskId: string,
    key: string,
    ...args: unknown[]
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

  async #getWorker() {
    return (this.#worker =
      this.#worker ?? (await OmniWorker.new(this.#serializedProcMap)))
  }

  #onTaskComplete(taskId: string) {
    if (this.#completionCallbacks[taskId]) {
      this.#completionCallbacks[taskId].forEach((cb) => cb())
      delete this.#completionCallbacks[taskId]
    }
    return true
  }

  #serializeProcMap(map: IProcMap): ISerializedProcMap {
    return Object.entries(map).reduce(
      (acc, [key, value]) =>
        Object.assign(acc, {
          [key]:
            typeof value === "function"
              ? value.toString()
              : value instanceof Task
              ? Task.getTaskFn(value).toString()
              : this.#serializeProcMap(value),
        }),
      {}
    )
  }

  #isTask(path: string) {
    const keys = path.split(".")
    const last = keys.pop()!
    // @ts-ignore
    const scope = keys.reduce((acc, key) => acc[key], this.#procMap)
    // @ts-ignore
    return scope[last] instanceof Task
  }
}
