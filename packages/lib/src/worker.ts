import type { IProcMap, WorkerParentMessage } from "./types"
import {
  deserializeProcMap,
  getProc,
  getProcMapScope,
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
  const { id, path, args, isTask } = e.data as WorkerParentMessage

  const scope = isTask
    ? createTaskScope(
        postMessage,
        (event: string, handler: any) => removeEventListener(event, handler),
        (event: string, handler: any) => addEventListener(event, handler)
      )
    : path.includes(".")
    ? getProcMapScope(procMap, path)
    : procMap

  try {
    const fn = getProc(procMap, path)
    const result = await fn.bind(scope)(...args)
    // check if the fn is a generator
    if (
      result &&
      result[Symbol.toStringTag]?.toString().includes("Generator")
    ) {
      // @ts-ignore
      const iterator = result as Generator | AsyncGenerator

      const next = async (value: any) => {
        const { value: nextValue, done } = await iterator.next(value)
        postMessage({ id, yield: nextValue, done })
      }

      const handler = (event: MessageEvent) => {
        if (!("next" in event.data)) return
        const { id: responseId, next: nextValue } = event.data
        if (responseId === id) {
          next(nextValue)
        }
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
