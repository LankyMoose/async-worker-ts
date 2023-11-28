import type { IProcMap, WorkerMessage } from "./types"
import { deserializeProcMap, getProc, getScope } from "./worker-shared.js"

let didInit = false
let procMap: IProcMap = {}
export const setProcMap = (map: IProcMap) => (procMap = map)

const isNode = typeof process !== "undefined" && process?.versions?.node

Object.assign(globalThis, {
  task(fn: (...args: any[]) => any) {
    return fn
  },
})

const parentPort = await (async () => {
  if (!isNode) return undefined
  const {
    parentPort: _parentPort,
    workerData,
    isMainThread,
  } = await import("node:worker_threads")
  if (isMainThread) return undefined
  const pm = await deserializeProcMap(workerData)
  setProcMap(pm)
  return _parentPort
})()

const postMessage = isNode
  ? (data: any) => parentPort?.postMessage(data)
  : (data: any) => self.postMessage(data)

const addEventListener = isNode
  ? (event: string, handler: any) => parentPort?.addListener(event, handler)
  : (event: string, handler: any) => self.addEventListener(event, handler)

const removeEventListener = isNode
  ? (event: string, handler: any) => parentPort?.removeListener(event, handler)
  : (event: string, handler: any) => self.removeEventListener(event, handler)

const handleMessage = async (e: MessageEvent) => {
  const data = isNode ? e : e.data
  if (!data) return
  if (!isNode && !didInit) {
    didInit = true
    procMap = await deserializeProcMap(data)
    postMessage("initialized")
  }

  if (!("path" in data)) return
  const { id, path, args, isTask } = data as WorkerMessage

  const scope = getScope({
    id,
    isTask,
    postMessage,
    removeEventListener,
    addEventListener,
    procMap,
    path,
  })

  try {
    const fn = getProc(procMap, path)
    const result = await fn.bind(scope)(...args)

    if (
      result &&
      result[Symbol.toStringTag]?.toString().includes("Generator")
    ) {
      const generator = result as Generator | AsyncGenerator

      const handler = async (event: MessageEvent<WorkerMessage>) => {
        const data = isNode ? event : event.data
        if (!("next" in data) && !("return" in data) && !("throw" in data))
          return

        const { id: responseId } = data
        if (responseId !== id) return

        const key =
          "next" in data ? "next" : "return" in data ? "return" : "throw"

        const res = await (generator[key] as (...args: any) => any)(
          ...(data[key] as any)
        )
        if (res.done) removeEventListener("message", handler)
        postMessage({ id, [key]: res.value, done: res.done })
      }

      addEventListener("message", handler)
      postMessage({ id, generator: true })
      return
    }
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}

if (isNode && parentPort) {
  parentPort.on("message", handleMessage)
} else if (!isNode && self) {
  self.addEventListener("message", handleMessage)
}
