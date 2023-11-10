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

  const { id, path, args, isTask } = e.data as WorkerParentMessage
  if (!("path" in e.data)) return

  const scope = isTask
    ? createTaskScope(postMessage, removeEventListener, addEventListener)
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
