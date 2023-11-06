let didInit = false
let procMap = {}
onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }
  const { id, path, args } = e.data
  try {
    // @ts-expect-error
    reportProgress = (progress) => {
      postMessage({ id, progress })
    }
    const result = await getProc(path)(...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}
function getProc(path) {
  const keys = path.split(".")
  let map = procMap
  while (keys.length) {
    const k = keys.shift()
    if (!map[k]) throw new Error(`No procedure found: "${path}"`)
    map = map[k]
    if (typeof map === "function") return map
  }
  throw new Error(`No procedure found: "${path}"`)
}
function deserializeProcMap(procMap) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] =
      typeof value === "string" ? eval(value) : deserializeProcMap(value)
    return acc
  }, {})
}
