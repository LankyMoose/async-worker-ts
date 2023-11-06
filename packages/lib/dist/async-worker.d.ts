import type { IProcMap, ProcedurePromise } from "./types.js";
export declare class AsyncWorker {
    private serializedProcMap;
    private worker;
    constructor(procMap: IProcMap);
    call(taskId: string, path: string, ...args: unknown[]): ProcedurePromise<unknown>;
    private getWorker;
    exit(): Promise<void>;
}
