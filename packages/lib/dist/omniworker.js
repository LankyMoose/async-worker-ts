const isNodeEnv = typeof process !== "undefined" && process.versions.node;
export class OmniWorker {
    worker = undefined;
    constructor(ctor, workerData, maxListeners = 256) {
        this.worker = new ctor(new URL(isNodeEnv ? "./worker.node.js" : "./worker.js", import.meta.url), {
            workerData,
            type: "module",
        });
        if (isNodeEnv)
            this.worker.setMaxListeners(maxListeners);
    }
    postMessage(message, transfer) {
        if (!this.worker)
            return;
        if (isNodeEnv) {
            ;
            this.worker.postMessage(message, transfer);
            return;
        }
        ;
        this.worker.postMessage(message, transfer);
    }
    addEventListener(event, listener) {
        if (!this.worker)
            return;
        if (isNodeEnv) {
            ;
            this.worker.on(event, listener);
            return;
        }
        ;
        this.worker.addEventListener(event, listener);
    }
    removeEventListener(event, listener) {
        if (!this.worker)
            return;
        if (isNodeEnv) {
            ;
            this.worker.off(event, listener);
            return;
        }
        ;
        this.worker.removeEventListener(event, listener);
    }
    static async new(workerData) {
        return new Promise(async (resolve) => {
            const worker = new OmniWorker(isNodeEnv ? (await import("worker_threads")).Worker : Worker, workerData);
            if (isNodeEnv)
                return resolve(worker);
            const connectHandler = async (e) => {
                if (e.data === "initialized") {
                    worker.removeEventListener("message", connectHandler);
                    resolve(worker);
                }
            };
            worker.addEventListener("message", connectHandler);
            worker.postMessage(workerData);
        });
    }
    async terminate() {
        if (!this.worker)
            return;
        if (isNodeEnv)
            this.worker.unref();
        await this.worker.terminate();
        this.worker = undefined;
    }
}
