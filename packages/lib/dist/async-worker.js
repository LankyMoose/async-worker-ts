import { OmniWorker } from "./omniworker.js";
import { Task } from "./task.js";
export class AsyncWorker {
    serializedProcMap;
    worker = undefined;
    completionCallbacks = {};
    constructor(procMap) {
        this.serializedProcMap = serializeProcMap(procMap);
    }
    call(path, isTask, ...args) {
        const taskId = crypto.randomUUID();
        const wp = this.getWorker();
        const promise = new Promise(async (resolve, reject) => {
            const worker = await wp;
            const handler = (event) => {
                if (!("result" in event.data))
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
            worker.postMessage({ id: taskId, path, args, isTask });
        });
        return Object.assign(promise, {
            on: async (event, callback) => {
                const emitHandler = async (e) => {
                    if (!("event" in e.data))
                        return;
                    const { id: msgId, event: taskEvent, data } = e.data;
                    if (taskEvent !== event)
                        return;
                    const res = callback(data);
                    if (res instanceof Promise)
                        await res;
                    wp.then(async (w) => w.postMessage({ id: msgId, data: res }));
                };
                wp.then((worker) => {
                    worker.addEventListener("message", emitHandler);
                    if (!this.completionCallbacks[taskId])
                        this.completionCallbacks[taskId] = [];
                    this.completionCallbacks[taskId].push(() => worker.removeEventListener("message", emitHandler));
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
                ? Task.getTaskFn(value).toString()
                : serializeProcMap(value),
    }), {});
}
