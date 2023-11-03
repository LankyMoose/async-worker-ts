import type { ProcMap } from "./types";
type NodeWorker = import("worker_threads").Worker;
type SomeWorker = NodeWorker | Worker;
export declare class AsyncWorker<T extends ProcMap> {
    private serializedProcMap;
    private worker;
    private isNode;
    initialization: Promise<this> | undefined;
    constructor(procMap: T);
    init(): Promise<this>;
    deInit(): Promise<void>;
    getWorker(): Promise<SomeWorker>;
    call<K extends keyof T>(key: K, ...args: Parameters<T[K]>): Promise<ReturnType<T[K]>>;
}
export {};
