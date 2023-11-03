
async function useWorker<T>(fn: {
  (...args: any[]): Promise<T>
}): Promise<T> {
  return await fn()
}

export default useWorker