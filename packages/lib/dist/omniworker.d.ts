/// <reference types="node" />
import type WorkerThreads from "worker_threads";
type NodeWorkerCtor = typeof WorkerThreads.Worker;
type WorkerCtor = typeof Worker;
type NodeTransferable = WorkerThreads.TransferListItem;
export declare class OmniWorker {
    private worker;
    constructor(ctor: WorkerCtor | NodeWorkerCtor, workerData: any);
    postMessage(message: any, transfer?: Transferable[] | NodeTransferable[] | undefined): void;
    addEventListener<K extends keyof WorkerEventMap>(event: K, listener: (ev: WorkerEventMap[K]) => any): void;
    removeEventListener<K extends keyof WorkerEventMap>(event: K, listener: (ev: WorkerEventMap[K]) => any): void;
    static new(workerData: any): Promise<OmniWorker>;
    terminate(): Promise<void>;
}
export {};
