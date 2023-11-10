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
    const result = await getProc(procMap, path).bind(scope)(...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}
