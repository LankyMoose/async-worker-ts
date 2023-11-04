import { Task } from "./task";
export type PromiseFunc = (...args: any[]) => Promise<any>;
export interface IProcMap {
    [key: string]: PromiseFunc | Task<readonly unknown[], any[], any>;
}
export type UseWorkerResult<T extends IProcMap> = {
    [K in keyof T]: T[K];
} & {
    exit: () => Promise<void>;
};
