import { IProcMap, ISerializedProcMap } from "./types"

export const AWT_DEBUG_GENERATED_SRC = false

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null

export function getScope(data: {
  id: string
  isTask: boolean
  postMessage: (message: any) => void
  removeEventListener: (event: string, handler: any) => void
  addEventListener: (event: string, handler: any) => void
  procMap: IProcMap
  path: string
}) {
  const {
    id,
    isTask,
    postMessage,
    removeEventListener,
    addEventListener,
    procMap,
    path,
  } = data
  const scope = isTask
    ? createTaskScope(id, postMessage, removeEventListener, addEventListener)
    : path.includes(".")
    ? getProcScope(procMap, path)
    : procMap
  return scope
}

export function getProc(procMap: IProcMap, path: string) {
  const keys = path.split(".") as string[]
  let map = procMap as any

  while (keys.length) {
    const k = keys.shift()!
    if (!map[k]) throw new Error(`No procedure found: "${path}"`)
    map = map[k]
    if (typeof map === "function") return map as { (...args: any): any }
  }

  throw new Error(`No procedure found: "${path}"`)
}
function getProcScope(procMap: IProcMap, path: string) {
  const keys = path.split(".")
  keys.pop()
  // @ts-ignore
  return keys.reduce((acc, key) => acc[key], procMap) as IProcMap
}
function createTaskScope(
  taskId: string,
  postMessage: (data: any) => void,
  removeListener: (event: string, handler: any) => void,
  addListener: (event: string, handler: any) => void
) {
  return {
    emit: (event: string, data: any) => {
      const msgId = crypto.randomUUID()

      return new Promise((resolve) => {
        const handler = async (event: MessageEvent) => {
          const d = isNode ? event : event.data
          if (!("data" in d)) return
          const { id, mid, data } = d
          if (id !== taskId || mid !== msgId) return
          removeListener("message", handler)
          resolve(data)
        }
        addListener("message", handler)
        postMessage({ id: taskId, mid: msgId, event, data })
      })
    },
  }
}
export async function deserializeProcMap(data: Record<string, any>) {
  return Object.entries(data as ISerializedProcMap).reduce(
    (acc, [key, value]) => {
      // @ts-ignore
      acc[key] =
        typeof value === "string" ? parseFunc(value) : deserializeProcMap(value)
      return acc
    },
    {} as IProcMap
  )
}

function parseFunc(str: string): (...args: any[]) => any {
  return new Function(`return ${str}`)()
}
