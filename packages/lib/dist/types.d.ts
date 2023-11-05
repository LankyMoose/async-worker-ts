import { Task } from "./task";
export type PromiseFunc = (...args: any[]) => Promise<any>;
export type Func = (...args: any[]) => any;
type WorkerProcedure = PromiseFunc | Func | Task<readonly unknown[], any[], any>;
export interface IProcMap {
    [key: string]: WorkerProcedure | IProcMap;
}
export interface ISerializedProcMap {
    [key: string]: string | ISerializedProcMap;
}
export type AsyncWorkerClient<T extends IProcMap> = {
    [K in keyof T]: InferredClientProc<T[K]>;
} & {
    exit: () => Promise<void>;
};
type InferredClientProc<T> = T extends PromiseFunc | Func ? (...args: Parameters<T>) => Promise<ReturnType<T>> : T extends Task<any, any, infer E> ? () => E extends Promise<any> ? E : Promise<E> : T extends IProcMap ? {
    [K in keyof T]: InferredClientProc<T[K]>;
} : never;
export {};
