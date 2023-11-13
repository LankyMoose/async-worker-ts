import type { IProcMap, WorkerMessage } from "./types"
import {
  deserializeProcMap,
  getProc,
  getProcScope,
  createTaskScope,
} from "./worker-shared.js"

let didInit = false
let procMap: IProcMap = {}

onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }

  if (!("path" in e.data)) return
  const { id, path, args, isTask } = e.data as WorkerMessage

  const scope = isTask
    ? createTaskScope(
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

      const handler = async (event: MessageEvent<WorkerMessage>) => {
        if (
          !("next" in event.data) &&
          !("return" in event.data) &&
          !("throw" in event.data)
        )
          return

        const { id: responseId } = event.data
        if (responseId !== id) return

        const key =
          "next" in event.data
            ? "next"
            : "return" in event.data
            ? "return"
            : "throw"

        const res = await (generator[key] as (...args: any) => any)(
          ...(event.data[key] as any)
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
