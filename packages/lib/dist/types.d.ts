import { Task } from "./task";
export type PromiseFunc = (...args: any[]) => Promise<any>;
export interface IProcMap {
    [key: string]: PromiseFunc | Task<readonly unknown[], any[], any>;
}
export type UseWorkerResult<T extends IProcMap> = {
    [K in keyof T]: T[K] extends PromiseFunc ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>> : T[K] extends Task<any, any, infer E> ? () => Promise<E> : never;
} & {
    exit: () => Promise<void>;
};
