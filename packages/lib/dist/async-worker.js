export class AsyncWorker {
    constructor() {
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
        this.init();
        //this.worker = new Worker(new URL("./worker.ts", import.meta.url))
    }
    async init() {
        if (this.initialization)
            return this.initialization;
        this.initialization = new Promise(async (resolve, reject) => {
            try {
                const ctor = this.isNode
                    ? (await import("worker_threads")).Worker
                    : Worker;
                this.worker = new ctor(new URL("./worker.ts", import.meta.url));
                resolve(this);
            }
            catch (error) {
                reject(error);
            }
        });
        return this;
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
                    if (this.isNode) {
                        ;
                        w.removeListener("message", handler);
                    }
                    else {
                        ;
                        w.removeEventListener("message", handler);
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
            };
            if (this.isNode) {
                ;
                w.on("message", handler);
            }
            else {
                ;
                w.addEventListener("message", handler);
            }
            w.postMessage({ id, key, args });
        });
    }
}
