export class AsyncWorker {
    constructor() {
        Object.defineProperty(this, "worker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.worker = new Worker(new URL("./worker.js", import.meta.url));
    }
    postMessage(message) {
        this.worker.postMessage(message);
    }
    onMessage(callback) {
        this.worker.onmessage = (event) => {
            callback(event.data);
        };
    }
    terminate() {
        this.worker.terminate();
    }
}
