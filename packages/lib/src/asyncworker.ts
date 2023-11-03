export class AsyncWorker {
  worker: Worker
  constructor() {
    this.worker = new Worker(new URL("./worker.js", import.meta.url))
  }
  postMessage(message: string) {
    this.worker.postMessage(message)
  }
  onMessage(callback: (message: string) => void) {
    this.worker.onmessage = (event) => {
      callback(event.data)
    }
  }
  terminate() {
    this.worker.terminate()
  }
}
