import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import { AWTTransferable } from "./transferable.js"
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

  exec(path: string, isTask: boolean, ...args: unknown[]) {
    const id = crypto.randomUUID()
    const wp = this.#getWorker()

    const promise = new Promise(async (resolve, reject) => {
      const worker = await wp
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

      const transferables = [] as Transferable[]
      const _args = args.map((arg) =>
        arg instanceof AWTTransferable
          ? (() => {
              const val = AWTTransferable.getTransferableValue(arg)
              transferables.push(val)
              return val
            })()
          : arg
      )

      worker.postMessage({ id, path, args: _args, isTask }, transferables)
    })

    if (this.#isTask(path)) return this.#extendPromise(promise, wp, id)
    return promise
  }

  exit() {
    if (this.#worker) this.#worker.terminate()
    this.#worker = undefined
  }

  #extendPromise(
    promise: Promise<unknown>,
    wp: Promise<OmniWorker>,
    taskId: string
  ) {
    return Object.assign(promise, {
      on: async (evt: string, callback: (data?: unknown) => unknown) => {
        const worker = await wp
        const emitHandler = async (e: MessageEvent) => {
          if (!("event" in e.data)) return
          const { id, mid, event, data } = e.data
          if (id !== taskId || event !== evt) return
          const cbRes = await callback(data)
          let _data
          const transferables = []

          if (cbRes !== undefined) {
            if (Array.isArray(cbRes)) {
              _data = cbRes.map((item) =>
                item instanceof AWTTransferable
                  ? (() => {
                      const val = AWTTransferable.getTransferableValue(item)
                      transferables.push(val)
                      return val
                    })()
                  : item
              )
            } else {
              _data = cbRes
              if (cbRes instanceof AWTTransferable) {
                const val = AWTTransferable.getTransferableValue(cbRes)
                transferables.push(val)
                _data = val
              }
            }
          }

          worker.postMessage({ id, mid, data: _data }, transferables)
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
