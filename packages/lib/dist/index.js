import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function (procMap) {
    return createClient(procMap);
}
export function task(fn) {
    return new Task(fn);
}
function createClient(map, worker = new AsyncWorker(map), path = "") {
    return Object.entries(map).reduce((acc, [k]) => {
        if (k === "exit")
            return acc;
        const p = path ? path + "." + k : k;
        const isCallable = map[k] instanceof Task || typeof map[k] === "function";
        if (isCallable) {
            return Object.assign(acc, {
                [k]: (...args) => worker.call(p, map[k] instanceof Task, ...args),
            });
        }
        return Object.assign(acc, {
            [k]: createClient(map[k], worker, p),
        });
    }, {
        exit: () => worker.exit(),
        concurrently: async (fn) => {
            const w = createClient(map);
            const res = await fn(w);
            w.exit();
            return res;
        },
    });
}
