import type { IProcMap, WorkerMessage } from "./types"
import { deserializeProcMap, getProc, getScope } from "./worker-shared.js"

let didInit = false
let procMap: IProcMap = {}

Object.assign(globalThis, {
  task(fn: (...args: any[]) => any) {
    return fn
  },
})

onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = await deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }

  if (!("path" in e.data)) return
  const { id, path, args, isTask } = e.data as WorkerMessage

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
