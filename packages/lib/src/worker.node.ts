import { isMainThread, workerData, parentPort } from "node:worker_threads"
import type { WorkerParentMessage } from "./types"
import {
  customGenerator,
  deserializeProcMap,
  getProc,
  getProcMapScope,
} from "./worker-funcs.js"

let generatedFnMap: { [key: string]: string } = {}

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  const postMessage = (data: any) => parentPort?.postMessage({ data })

  parentPort.on("message", async (e: WorkerParentMessage) => {
    const { id, path, args } = e as WorkerParentMessage
    if ("yield" in e) return
    if ("result" in e) return

    const scope = path.includes(".") ? getProcMapScope(procMap, path) : procMap

    try {
      // @ts-expect-error
      globalThis.reportProgress = (progress: number) =>
        postMessage({ id, progress })

      // @ts-expect-error
      globalThis._____yield = async (value: any) => {
        postMessage({ id, yield: value })

        return new Promise((resolve) => {
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
      }

      let fn = getProc(procMap, path)
      const toStringTag = (fn as any)[Symbol.toStringTag]
      const isGenerator = toStringTag?.endsWith("GeneratorFunction")

      if (isGenerator) {
        const genSrc =
          generatedFnMap[path] ??
          (generatedFnMap[path] = customGenerator(fn.toString()))

        let gfn = eval(`(${genSrc})`) as (...args: any[]) => any
        fn = gfn
      }

      const result = await fn.bind(scope)(...args)
      postMessage({ id, result })
    } catch (error) {
      postMessage({ id, error })
    }
  })
}
