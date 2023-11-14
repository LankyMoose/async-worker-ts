import { isMainThread, workerData, parentPort } from "node:worker_threads"
import type { WorkerMessage } from "./types"
import {
  deserializeProcMap,
  getProc,
  getProcScope,
  createTaskScope,
} from "./worker-shared.js"

if (!isMainThread && parentPort) {
  if (!workerData) throw new Error("workerData not provided")
  const procMap = deserializeProcMap(workerData)

  const postMessage = (data: any) => parentPort?.postMessage({ data })
  const addEventListener = (event: string, handler: any) =>
    parentPort?.addListener(event, handler)
  const removeEventListener = (event: string, handler: any) =>
    parentPort?.removeListener(event, handler)

  parentPort.on("message", async (e: WorkerMessage) => {
    if (!("path" in e)) return
    const { id, path, args, isTask } = e

    const scope = isTask
      ? createTaskScope(
          id,
          postMessage,
          (event: string, handler: any) => removeEventListener(event, handler),
          (event: string, handler: any) => addEventListener(event, handler)
        )
      : path.includes(".")
      ? getProcScope(procMap, path)
      : procMap

    try {
      const fn = getProc(procMap, path)
      const result = await fn.bind(scope)(...args)

      if (
        result &&
        result[Symbol.toStringTag]?.toString().includes("Generator")
      ) {
        const generator = result as Generator | AsyncGenerator

        const handler = async (event: WorkerMessage) => {
          if (!("next" in event) && !("return" in event) && !("throw" in event))
            return

          const { id: responseId } = event
          if (responseId !== id) return

          const key =
            "next" in event ? "next" : "return" in event ? "return" : "throw"

          const res = await (generator[key] as (...args: any) => any)(
            ...(event[key] as any)
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
  })
}
