export { AsyncWorker } from "./asyncworker.js"

export async function useWorker<T>(fn: {
  (...args: any[]): Promise<T>
}): Promise<T> {
  return await fn()
}
