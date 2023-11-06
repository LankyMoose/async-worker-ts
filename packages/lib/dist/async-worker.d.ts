import type { IProcMap, PromiseFunc } from "./types.js";
export declare class AsyncWorker {
    private serializedProcMap;
    private worker;
    constructor(procMap: IProcMap);
    call<U extends PromiseFunc>(path: string, ...args: Parameters<U>): Promise<ReturnType<U>>;
    private getWorker;
    exit(): Promise<void>;
}
