import {
  isMainThread,
  workerData,
  parentPort,
  MessagePort,
} from "node:worker_threads"

if (!isMainThread && parentPort) {
  const procMap = deserializeProcMap(workerData)
  parentPort.on("message", async ({ id, key, args }) => {
    const pp = parentPort as MessagePort
    try {
      const result = await procMap[key](...args)
      pp.postMessage({ data: { id, result } })
    } catch (error) {
      pp.postMessage({ data: { id, error } })
    }
  })
}

function deserializeProcMap(procMap: Record<string, string>) {
  return Object.entries(procMap).reduce((acc, [key, value]) => {
    acc[key] = eval(`(${value})`)
    return acc
  }, {} as Record<string, (...args: any[]) => Promise<any>>)
}
