import { isMainThread, workerData, parentPort } from "node:worker_threads"
import type { WorkerParentMessage } from "./types"
import {
  deserializeProcMap,
  getProc,
  getProcMapScope,
} from "./worker-shared.js"
import { Task } from "./task.js"

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  const postMessage = (data: any) => parentPort?.postMessage({ data })

  parentPort.on("message", async (e: WorkerParentMessage) => {
    const { id, path, args, isTask } = e as WorkerParentMessage
    if ("yield" in e) return
    if ("result" in e) return

    const scope = isTask
      ? (() => {
          // @ts-expect-error
          const t = new Task()
          t.reportProgress = (progress: number) => postMessage({ id, progress })
          return t
        })()
      : path.includes(".")
      ? getProcMapScope(procMap, path)
      : procMap

    try {
      Object.assign(globalThis, {
        ["_____yield"]: async (value: any) => {
          postMessage({ id, yield: value })

          return new Promise<unknown>((resolve) => {
            const handler = async (event: WorkerParentMessage) => {
              if (!("yield" in event) && !("result" in event)) return
              const { id: responseId, yield: yieldInputValue, result } = event
              if (responseId !== id) return

              parentPort?.removeListener("message", handler)
              if ("result" in event) return resolve(result)
              resolve(yieldInputValue)
            }

            parentPort?.addListener("message", handler)
          })
        },
      })

      const result = await getProc(procMap, path).bind(scope)(...args)
      postMessage({ id, result })
    } catch (error) {
      postMessage({ id, error })
    }
  })
}
