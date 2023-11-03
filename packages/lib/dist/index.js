export { AsyncWorker } from "./asyncworker.js";
export async function useWorker(fn) {
    return await fn();
}
