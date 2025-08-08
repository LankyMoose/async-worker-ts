import { OmniWorker } from "./omniworker.js"
import { Task } from "./task.js"
import { AWTTransferable } from "./transferable.js"
import type { IProcMap, ISerializedProcMap } from "./types.js"

const isNode = typeof process !== "undefined" && process?.versions?.node
type WorkerState = "none" | "pending" | "active"

export class AsyncWorker {
  #procMap: IProcMap
  #serializedProcMap: ISerializedProcMap
  #worker: OmniWorker | undefined = undefined
  #completionCallbacks: { [taskId: string]: (() => void)[] } = {}
  #workerPromiseQueue: Array<(worker: OmniWorker) => void> = []
  #workerState: WorkerState = "none"

  constructor(procMap: IProcMap) {
    this.#procMap = procMap
    this.#serializedProcMap = this.#serializeProcMap(procMap)
  }

  exec(path: string, ...args: unknown[]): Promise<unknown> {
    if (this.#workerState === "none") this.#initWorker()
    const jobId = crypto.randomUUID()
    const { promise: jobPromise, resolve, reject } = createPromise<unknown>()

    const workerPromise = new Promise<OmniWorker>((resolve) => {
      if (this.#worker) return resolve(this.#worker)

      this.#workerPromiseQueue.push(resolve)
    })

    const isTask = this.#isTask(path)

    if (isTask) {
      this.#wrapTaskPromise(jobId, jobPromise, workerPromise)
    }

    workerPromise.then((worker) => {
      this.#createJobPromise(worker, jobId, path, isTask, ...args)
        .then(resolve)
        .catch(reject)
    })

    return jobPromise
  }

  exit() {
    if (this.#worker) this.#worker.terminate()
    this.#worker = undefined
    this.#workerState = "none"
  }

  #initWorker() {
    if (this.#workerState !== "none") return
    this.#workerState = "pending"

    OmniWorker.new(this.#serializedProcMap)
      .then((worker) => {
        this.#worker = worker
        this.#workerState = "active"
        while (this.#workerPromiseQueue.length) {
          this.#workerPromiseQueue.shift()!(worker)
        }
      })
      .catch((e) => {
        this.#workerState = "none"
        throw e
      })
  }

  #createJobPromise(
    worker: OmniWorker,
    jobId: string,
    path: string,
    isTask: boolean,
    ...args: unknown[]
  ) {
    return new Promise(async (resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const data = isNode ? event : event.data
        const { id: resId, result, error, generator } = data

        if (resId !== jobId) return
        if (!("result" in data) && !("error" in data) && !("generator" in data))
          return

        worker.removeEventListener("message", handler)

        if (generator) {
          return resolve(this.#createGenerator(worker, jobId, args))
        }

        this.#onJobComplete(jobId)
        return error ? reject(error) : resolve(result)
      }
      worker.addEventListener("message", handler)

      const [_args, transferables] = this.#formatMessageArgs(args)
      worker.postMessage(
        { id: jobId, path, args: _args, isTask },
        transferables
      )
    })
  }

  #wrapTaskPromise(
    jobId: string,
    jobPromise: Promise<unknown>,
    workerPromise: Promise<OmniWorker>
  ) {
    Object.assign(jobPromise, {
      on: async (evt: string, callback: (data?: unknown) => unknown) => {
        const worker = await workerPromise

        const emitHandler = async (e: MessageEvent) => {
          const msgData = isNode ? e : e.data
          if (!("event" in msgData)) return

          const { id, mid, event, data } = msgData
          if (id !== jobId || event !== evt) return

          const cbRes = await callback(data)
          if (cbRes === undefined) {
            return worker.postMessage({ id, mid, data: undefined })
          }

          if (Array.isArray(cbRes)) {
            const [data, transferables] = this.#formatMessageArgs(cbRes)
            return worker.postMessage({ id, mid, data }, transferables)
          }

          if (cbRes instanceof AWTTransferable) {
            const data = AWTTransferable.getTransferableValue(cbRes)
            return worker.postMessage({ id, mid, data }, [data])
          }

          worker.postMessage({ id, mid, data: cbRes })
        }

        worker.addEventListener("message", emitHandler)
        if (!this.#completionCallbacks[jobId])
          this.#completionCallbacks[jobId] = []

        this.#completionCallbacks[jobId].push(() =>
          worker.removeEventListener("message", emitHandler)
        )

        return jobPromise
      },
    })
  }

  #formatMessageArgs(args: unknown[]): [unknown[], Transferable[]] {
    const _args: unknown[] = []
    const transferables: Transferable[] = []
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (!(arg instanceof AWTTransferable)) {
        _args.push(arg)
        continue
      }
      const val = AWTTransferable.getTransferableValue(arg)
      transferables.push(val)
      _args.push(val)
    }
    return [_args, transferables]
  }

  #createGenerator(worker: OmniWorker, jobId: string, ...args: unknown[]) {
    const generateTx = this.#createGeneratorTx
    return Object.assign(
      (async function* (...next: unknown[]) {
        while (true) {
          const { value, done } = await generateTx(worker, jobId, "next", next)
          if (done) return value

          next = yield value
        }
      })(...args),
      {
        return: (value: unknown) => generateTx(worker, jobId, "return", value),
        throw: (error: unknown) => generateTx(worker, jobId, "throw", error),
      }
    ) as AsyncGenerator<unknown, unknown, unknown>
  }

  #createGeneratorTx(
    worker: OmniWorker,
    jobId: string,
    key: string,
    ...args: unknown[]
  ) {
    return new Promise<any>(async (res) => {
      const handler = (event: MessageEvent) => {
        const data = isNode ? event : event.data
        if (!(key in data)) return
        const { id: responseId, [key]: value, done } = data

        if (responseId !== jobId) return
        worker.removeEventListener("message", handler)
        res({ value, done })
      }

      if (args && args.length > 0) await Promise.all(args)
      worker.addEventListener("message", handler)
      worker.postMessage({ id: jobId, [key]: args })
    })
  }

  #onJobComplete(jobId: string) {
    if (this.#completionCallbacks[jobId]) {
      this.#completionCallbacks[jobId].forEach((cb) => cb())
      delete this.#completionCallbacks[jobId]
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

function createPromise<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: any) => void
} {
  let resolve: (value: T | PromiseLike<T>) => void
  let reject: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {
    promise,
    resolve: (value: T | PromiseLike<T>) => resolve(value),
    reject: (reason?: any) => reject(reason),
  }
}
