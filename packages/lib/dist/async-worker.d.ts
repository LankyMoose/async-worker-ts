import type { IProcMap, ProcedurePromise } from "./types.js";
export declare class AsyncWorker {
    private serializedProcMap;
    private worker;
    private completionCallbacks;
    constructor(procMap: IProcMap);
    call(path: string, isTask: boolean, ...args: unknown[]): ProcedurePromise<unknown>;
    private getWorker;
    exit(): Promise<void>;
}
