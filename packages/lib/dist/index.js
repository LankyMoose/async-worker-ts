import { AsyncWorker } from "./async-worker.js";
import { Task } from "./task.js";
export default function useWorker(procMap) {
    const worker = new AsyncWorker(procMap);
    return Object.entries(procMap).reduce((acc, [key]) => {
        if (key === "exit")
            return acc;
        if (procMap[key] instanceof Task) {
            // @ts-ignore
            acc[key] = async (...args) => worker.callTask(key, ...args);
            return acc;
        }
        // @ts-ignore
        acc[key] = async (...args) => worker.call(key, ...args);
        return acc;
    }, { exit: () => worker.deInit() });
}
const worker = useWorker({
    calculatePi: async () => {
        let pi = 0;
        for (let i = 0; i < 1000000000; i++) {
            pi += Math.pow(-1, i) / (2 * i + 1);
        }
        return pi * 4;
    },
    test: new Task((a, b) => a + b, [1, 2]),
});
const res = worker.test.fn(...worker.test.args);
