import type { ProcMap } from "./types";
type NodeWorker = import("worker_threads").Worker;
type SomeWorker = NodeWorker | Worker;
export declare class AsyncWorker<T extends ProcMap> {
    private procMap;
    private worker;
    private isNode;
    initialization: Promise<this> | undefined;
    constructor(procMap: T);
    serializeProcMap(): Record<string, string>;
    init(): Promise<this>;
    deInit(): Promise<void>;
    getWorker(): Promise<SomeWorker>;
    call<K extends keyof T>(key: K, ...args: Parameters<T[K]>): Promise<ReturnType<T[K]>>;
}
export {};
