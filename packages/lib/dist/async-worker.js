export class AsyncWorker {
    constructor(procMap) {
        Object.defineProperty(this, "procMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "worker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        Object.defineProperty(this, "isNode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: typeof window === "undefined"
        });
        Object.defineProperty(this, "initialization", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        this.procMap = procMap;
        this.init();
    }
    serializeProcMap() {
        return Object.entries(this.procMap).reduce((acc, [key, value]) => {
            // @ts-ignore
            acc[key] = value.toString();
            return acc;
        }, {});
    }
    async init() {
        if (this.initialization)
            return this.initialization;
        this.initialization = new Promise(async (resolve, reject) => {
            try {
                const ctor = this.isNode
                    ? (await import("worker_threads")).Worker
                    : Worker;
                this.worker = new ctor(new URL(this.isNode ? "./worker.node.js" : "./worker.js", import.meta.url), {
                    workerData: this.serializeProcMap(),
                });
                if (!this.isNode) {
                    this.worker.postMessage(this.serializeProcMap());
                    this.worker.addEventListener("message", (e) => {
                        if (e.data === "initialized")
                            resolve(this);
                    });
                }
                else {
                    resolve(this);
                }
            }
            catch (error) {
                reject(error);
            }
        });
        return this;
    }
    async deInit() {
        if (!this.worker)
            return;
        await this.worker.terminate();
        this.worker = undefined;
        this.initialization = undefined;
    }
    async getWorker() {
        if (!this.worker) {
            await this.init();
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
                    removeEvtListener(w, handler);
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
            };
            addEvtListener(w, handler);
            w.postMessage({ id, key, args });
        });
    }
}
function removeEvtListener(w, handler) {
    if ("window" in globalThis) {
        ;
        w.removeEventListener("message", handler);
    }
    else {
        ;
        w.removeListener("message", handler);
    }
}
function addEvtListener(w, handler) {
    if ("window" in globalThis) {
        ;
        w.addEventListener("message", handler);
    }
    else {
        ;
        w.on("message", handler);
    }
}
