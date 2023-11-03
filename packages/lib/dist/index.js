import { AsyncWorker } from "./async-worker.js";
export default function useWorker(procMap) {
    const worker = new AsyncWorker();
    return Object.entries(procMap).reduce((acc, [key]) => {
        // @ts-ignore
        acc[key] = async (...args) => worker.call(key, ...args);
        return acc;
    }, {});
}
