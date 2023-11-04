const isNodeEnv = typeof process !== "undefined" && process.versions.node;
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    constructor(procMap) {
        this.serializedProcMap = Object.entries(procMap).reduce((acc, [key, value]) => Object.assign(acc, { [key]: value.toString() }), {});
    }
    async exit() {
        if (this.worker)
            await this.worker?.terminate();
        this.worker = undefined;
    }
    async getWorker() {
        if (!this.worker) {
            this.worker = await OmniWorker.new(this.serializedProcMap);
        }
        return this.worker;
    }
    call(key, ...args) {
        return new Promise(async (resolve, reject) => {
            const w = await this.getWorker();
            const id = Math.random().toString(36).slice(2);
            const handler = async (event) => {
                const { id: responseId, result, error } = event.data;
                if (responseId === id) {
                    w.removeEventListener("message", handler);
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
            };
            w.addEventListener("message", handler);
            w.postMessage({ id, key, args });
        });
    }
}
class OmniWorker {
    worker = undefined;
    constructor(ctor, workerData) {
        this.worker = new ctor(new URL(isNodeEnv ? "./worker.node.js" : "./worker.js", import.meta.url), { workerData });
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
    async terminate() {
        if (!this.worker)
            return;
        if (isNodeEnv)
            this.worker.unref();
        await this.worker.terminate();
        this.worker = undefined;
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
}
