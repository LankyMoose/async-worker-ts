import type { IProcMap, PromiseFunc } from "./types.js";
type NodeWorker = import("worker_threads").Worker;
type SomeWorker = NodeWorker | Worker;
export declare class AsyncWorker<T extends IProcMap> {
    private serializedProcMap;
    private worker;
    private isNode;
    initialization: Promise<this> | undefined;
    constructor(procMap: T);
    init(): Promise<this>;
    deInit(): Promise<void>;
    getWorker(): Promise<SomeWorker>;
    call<K extends keyof T, U extends PromiseFunc>(key: K, ...args: Parameters<U>): Promise<ReturnType<U>>;
}
export {};
