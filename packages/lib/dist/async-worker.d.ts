import type { IProcMap } from "./types.js";
export declare class AsyncWorker {
    private serializedProcMap;
    private worker;
    constructor(procMap: IProcMap);
    call(path: string, ...args: unknown[]): Promise<unknown>;
    private getWorker;
    exit(): Promise<void>;
}
