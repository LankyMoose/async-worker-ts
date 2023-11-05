import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function useWorker(procMap) {
    return createClient(procMap);
}
export function task(fn, args) {
    return new Task(fn, args);
}
function createClient(map, worker = new AsyncWorker(map), path = "") {
    const joinPath = (a, b) => a === "" ? b : b === "" ? a : a + "." + b;
    return Object.entries(map).reduce((acc, [key]) => {
        if (key === "exit")
            return acc;
        if (map[key] instanceof Task) {
            return Object.assign(acc, {
                [key]: async () => worker.call(joinPath(path, key), ...map[key].getArgs()),
            });
        }
        if (typeof map[key] === "function") {
            return Object.assign(acc, {
                [key]: async (...args) => worker.call(joinPath(path, key), ...args),
            });
        }
        return Object.assign(acc, {
            [key]: createClient(map[key], worker, joinPath(path, key)),
        });
    }, { exit: () => worker.exit() });
}
