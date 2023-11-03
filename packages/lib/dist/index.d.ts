export { AsyncWorker } from "./asyncworker.js";
export declare function useWorker<T>(fn: {
    (...args: any[]): Promise<T>;
}): Promise<T>;
