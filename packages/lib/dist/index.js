import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function (procMap) {
    return createClient(procMap);
}
export function task(fn, args) {
    return new Task(fn, args);
}
function createClient(map, worker = new AsyncWorker(map), path = "") {
    return Object.entries(map).reduce((acc, [key]) => {
        if (key === "exit")
            return acc;
        const p = !path ? key : path + "." + key;
        if (map[key] instanceof Task) {
            return Object.assign(acc, {
                [key]: async () => worker.call(p, ...map[key].getArgs()),
            });
        }
        if (typeof map[key] === "function") {
            return Object.assign(acc, {
                [key]: async (...args) => worker.call(p, ...args),
            });
        }
        return Object.assign(acc, {
            [key]: createClient(map[key], worker, p),
        });
    }, { exit: () => worker.exit() });
}
