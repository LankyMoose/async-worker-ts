import { Task } from "./task.js";
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    isNode = typeof process !== "undefined" && process?.versions?.node;
    initialization = undefined;
    constructor(procMap) {
        this.serializedProcMap = serializeProcMap(procMap);
        this.init();
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
                    workerData: this.serializedProcMap,
                });
                if (!this.isNode) {
                    this.worker.postMessage(this.serializedProcMap);
                    const connectHandler = async (e) => {
                        if (e.data === "initialized") {
                            removeEvtListener(this.worker, connectHandler);
                            resolve(this);
                        }
                    };
                    addEvtListener(this.worker, connectHandler);
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
        const w = await this.getWorker();
        if (!w)
            return;
        if (this.isNode)
            w.unref();
        await w.terminate();
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
function serializeProcMap(procMap) {
    return Object.entries(procMap).reduce((acc, [key, value]) => {
        // @ts-ignore
        acc[key] = value instanceof Task ? value.serialize() : value.toString();
        return acc;
    }, {});
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
