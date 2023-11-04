import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function useWorker(procMap) {
    const worker = new AsyncWorker(procMap);
    return Object.entries(procMap).reduce((acc, [key]) => {
        if (key === "exit")
            return acc;
        if (procMap[key] instanceof Task) {
            return Object.assign(acc, {
                [key]: async () => worker.call(key, ...procMap[key].getArgs()),
            });
        }
        return Object.assign(acc, {
            [key]: async (...args) => worker.call(key, ...args),
        });
    }, { exit: () => worker.exit() });
}
export function task(fn, args) {
    return Object.assign(new Task(fn, []), {
        getArgs: typeof args === "function" ? args : () => args,
    });
}
