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
                if ("generator" in event.data) {
                    return resolve(Object.assign((async function* (...next) {
                        while (true) {
                            const { value, done } = await new Promise(async (res) => {
                                const handler = (event) => {
                                    if (!("yield" in event.data))
                                        return;
                                    const { id: responseId, yield: yieldRes, done, } = event.data;
                                    if (responseId !== taskId)
                                        return;
                                    res({ value: yieldRes, done });
                                };
                                if (next && next.length > 0)
                                    await Promise.all(next);
                                worker.addEventListener("message", handler);
                                worker.postMessage({ id: taskId, next });
                            });
                            if (done) {
                                worker.removeEventListener("message", handler);
                                return value;
                            }
                            next = yield value;
                        }
                    })(...args), {
                        return: (value) => {
                            return new Promise((res) => {
                                worker.postMessage({ id: taskId, return: value });
                                const handler = (event) => {
                                    if (!("return" in event.data))
                                        return;
                                    const { id: responseId, return: returnRes, done, } = event.data;
                                    if (responseId !== taskId)
                                        return;
                                    worker.removeEventListener("message", handler);
                                    res({ value: returnRes, done });
                                };
                                worker.addEventListener("message", handler);
                            });
                        },
                        throw: (error) => {
                            return new Promise((res) => {
                                worker.postMessage({ id: taskId, throw: error });
                                const handler = (event) => {
                                    if (!("throw" in event.data))
                                        return;
                                    const { id: responseId, throw: throwRes, done, } = event.data;
                                    if (responseId !== taskId)
                                        return;
                                    worker.removeEventListener("message", handler);
                                    res({ value: throwRes, done });
                                };
                                worker.addEventListener("message", handler);
                            });
                        },
                    }));
                }
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
