import type { ProcMap } from "./types";
type SomeWorker = import("worker_threads").Worker | Worker;
export declare class AsyncWorker<T extends ProcMap> {
    private worker;
    private isNode;
    initialization: Promise<this> | undefined;
    constructor();
    init(): Promise<this>;
    getWorker(): Promise<SomeWorker>;
    call<K extends keyof T>(key: K, ...args: Parameters<T[K]>): Promise<ReturnType<T[K]>>;
}
export {};
