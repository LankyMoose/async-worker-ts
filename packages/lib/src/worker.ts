let didInit = false

let procMap: Record<string, (...args: any[]) => Promise<any>> = {}

onmessage = async (e) => {
  if (!e.data) return
  if (!didInit) {
    procMap = deserializeProcMap(e.data)
    didInit = true
    postMessage("initialized")
    return
  }

  const { id, key, args } = e.data

  try {
    const result = await procMap[key](...args)
    postMessage({ id, result })
  } catch (error) {
    postMessage({ id, error })
  }
}

function deserializeProcMap(procMap: Record<string, string>) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] = eval(`(${value})`)
    return acc
  }, {} as Record<string, (...args: any[]) => Promise<any>>)
}
