import { IProcMap, ISerializedProcMap } from "./types"

export const AWT_DEBUG_GENERATED_SRC = false

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null

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
export function getProcScope(procMap: IProcMap, path: string) {
  const keys = path.split(".")
  keys.pop()
  // @ts-ignore
  return keys.reduce((acc, key) => acc[key], procMap) as IProcMap
}
export function createTaskScope(
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
export function deserializeProcMap(procMap: ISerializedProcMap) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === "string" ? parseFunc(value) : deserializeProcMap(value)
    return acc
  }, {} as IProcMap)
}

function parseFunc(str: string): (...args: any[]) => any {
  const transformed = ensureFuncHasName(str)
  return eval(`(${transformed})`)
}

function ensureFuncHasName(str: string) {
  str = str.trim()

  const fn_name_internal = "___thunk___"
  let isGenerator = false

  replaceIfStartsWith([str], "function (", `function ${fn_name_internal}(`)
  replaceIfStartsWith(
    [str],
    "async function (",
    `async function ${fn_name_internal}(`
  )
  isGenerator = replaceIfStartsWith(
    [str],
    "function* (",
    `function* ${fn_name_internal}(`
  )
  isGenerator =
    replaceIfStartsWith(
      [str],
      "async function* (",
      `async function* ${fn_name_internal}(`
    ) || isGenerator

  if (AWT_DEBUG_GENERATED_SRC) console.debug(str)

  return str
}
function replaceIfStartsWith([str]: [string], search: string, replace: string) {
  if (str.startsWith(search)) {
    str = str.replace(search, replace)
    return true
  }
  return false
}
