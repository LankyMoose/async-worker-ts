import { OmniWorker } from "./omniworker.js";
import { Task } from "./task.js";
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    completionCallbacks = {};
    constructor(procMap) {
        this.serializedProcMap = serializeProcMap(procMap);
    }
    call(path, ...args) {
        const taskId = Math.random().toString(36).slice(2);
        const wp = this.getWorker();
        const promise = new Promise(async (resolve, reject) => {
            const worker = await wp;
            const handler = (event) => {
                if ("progress" in event.data)
                    return;
                const { id: responseId, result, error } = event.data;
                if (responseId === taskId) {
                    worker.removeEventListener("message", handler);
                    if (this.completionCallbacks[taskId]) {
                        this.completionCallbacks[taskId].forEach((cb) => cb());
                        delete this.completionCallbacks[taskId];
                    }
                    return error ? reject(error) : resolve(result);
                }
            };
            worker.addEventListener("message", handler);
            worker.postMessage({ id: taskId, path, args });
        });
        return Object.assign(promise, {
            onProgress: (cb) => {
                const progressHandler = async (event) => {
                    if (!("progress" in event.data))
                        return;
                    const { id, progress } = event.data;
                    if (id !== taskId)
                        return;
                    cb(progress);
                };
                wp.then((worker) => {
                    worker.addEventListener("message", progressHandler);
                    if (!this.completionCallbacks[taskId])
                        this.completionCallbacks[taskId] = [];
                    this.completionCallbacks[taskId].push(() => worker.removeEventListener("message", progressHandler));
                });
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
