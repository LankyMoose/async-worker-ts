import type { IProcMap, PromiseFunc } from "./types.js";
export declare class AsyncWorker<T extends IProcMap> {
    private serializedProcMap;
    private worker;
    constructor(procMap: T);
    exit(): Promise<void>;
    getWorker(): Promise<OmniWorker>;
    call<K extends keyof T, U extends PromiseFunc>(key: K, ...args: Parameters<U>): Promise<ReturnType<U>>;
}
declare class OmniWorker {
    private worker;
    constructor(ctor: typeof Worker | typeof import("worker_threads").Worker, workerData: any);
    static new(workerData: any): Promise<OmniWorker>;
    postMessage(message: any, transfer?: Transferable[] | import("worker_threads").TransferListItem[] | undefined): void;
    terminate(): Promise<void>;
    addEventListener<K extends keyof WorkerEventMap>(event: K, listener: (ev: WorkerEventMap[K]) => any): void;
    removeEventListener<K extends keyof WorkerEventMap>(event: K, listener: (ev: WorkerEventMap[K]) => any): void;
}
export {};
