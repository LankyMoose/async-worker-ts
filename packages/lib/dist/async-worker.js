import { OmniWorker } from "./omniworker.js";
import { Task } from "./task.js";
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    completionCallbacks = {};
    constructor(procMap) {
        this.serializedProcMap = serializeProcMap(procMap);
    }
    call(taskId, path, ...args) {
        const wp = this.getWorker();
        const promise = new Promise(async (resolve, reject) => {
            const worker = await wp;
            const handler = async (event) => {
                const { id: responseId, result, error, progress } = event.data;
                if (progress !== undefined)
                    return;
                if (responseId === taskId) {
                    worker.removeEventListener("message", handler);
                    if (this.completionCallbacks[taskId]) {
                        this.completionCallbacks[taskId]();
                        delete this.completionCallbacks[taskId];
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
            };
            worker.addEventListener("message", handler);
            worker.postMessage({ id: taskId, path, args });
        });
        return Object.assign(promise, {
            onProgress: async (cb) => {
                const worker = await wp;
                const progressHandler = async (event) => {
                    const { id, progress } = event.data;
                    if (progress === undefined)
                        return;
                    if (id !== taskId)
                        return;
                    cb(progress);
                };
                worker.addEventListener("message", progressHandler);
                this.completionCallbacks[taskId] = () => {
                    worker.removeEventListener("message", progressHandler);
                };
                return promise;
            },
        });
    }
    async getWorker() {
        if (!this.worker) {
            this.worker = await OmniWorker.new(this.serializedProcMap);
        }
        return this.worker;
    }
    async exit() {
        if (this.worker)
            await this.worker.terminate();
        this.worker = undefined;
    }
}
function serializeProcMap(map) {
    return Object.entries(map).reduce((acc, [key, value]) => Object.assign(acc, {
        [key]: typeof value === "function"
            ? value.toString()
            : value instanceof Task
                ? value.fn.toString()
                : serializeProcMap(value),
    }), {});
}
