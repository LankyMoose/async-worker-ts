import { Task } from "./task";
export type Func = (...args: any[]) => any;
type WorkerProcedure = Func | Task<readonly unknown[], any[], any>;
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
export type ProcedurePromise<T> = Promise<T> & {
    onProgress: (cb: (percent: number) => void) => Promise<T>;
};
type InferredClientProc<T> = T extends Func ? (...args: Parameters<T>) => ProcedurePromise<ReturnType<T>> : T extends Task<any, any, infer E> ? () => E extends ProcedurePromise<any> ? E : ProcedurePromise<E> : T extends IProcMap ? {
    [K in keyof T]: InferredClientProc<T[K]>;
} : never;
export {};
