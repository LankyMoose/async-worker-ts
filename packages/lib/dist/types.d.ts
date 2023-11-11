import { Task } from "./task";
type Func = (...args: any[]) => any;
export interface IProcMap {
    [key: string]: Func | Task<readonly unknown[], any> | IProcMap;
}
export interface ISerializedProcMap {
    [key: string]: string | ISerializedProcMap;
}
export type AsyncWorkerClient<T extends IProcMap> = {
    [K in keyof T]: InferredClientProc<T[K]>;
} & {
    concurrently: <E>(fn: (worker: AsyncWorkerClient<T>) => E) => Promise<E>;
    exit: () => Promise<void>;
};
export type ProcedurePromise<T> = Promise<T> & {
    on: (event: string, callback: (data?: any) => void) => ProcedurePromise<T>;
};
export type WorkerMessage = {
    id: string;
    path: string;
    args: unknown[];
    isTask?: boolean;
    next?: unknown;
    return?: unknown;
    throw?: unknown;
};
type InferredClientProc<T> = T extends Task<infer Args, infer E> ? (...args: Args) => E extends ProcedurePromise<any> ? E : ProcedurePromise<E> : T extends Func ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>> : T extends IProcMap ? {
    [K in keyof T]: InferredClientProc<T[K]>;
} : never;
export {};
