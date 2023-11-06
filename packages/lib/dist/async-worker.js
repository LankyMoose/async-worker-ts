import { OmniWorker } from "./omniworker.js";
import { Task } from "./task.js";
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    constructor(procMap) {
        this.serializedProcMap = serializeProcMap(procMap);
    }
    call(taskId, path, ...args) {
        const w = this.getWorker();
        const promise = new Promise(async (resolve, reject) => {
            const handler = async (event) => {
                const { id: responseId, result, error, progress } = event.data;
                if (progress !== undefined)
                    return;
                if (responseId === taskId) {
                    ;
                    (await w).removeEventListener("message", handler);
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                }
            };
            (await w).addEventListener("message", handler);
            (await w).postMessage({ id: taskId, path, args });
        });
        return Object.assign(promise, {
            onProgress: async (cb) => {
                ;
                (await w).addEventListener("message", async (event) => {
                    const { id, progress } = event.data;
                    if (progress === undefined)
                        return;
                    if (id !== taskId)
                        return;
                    cb(progress);
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
