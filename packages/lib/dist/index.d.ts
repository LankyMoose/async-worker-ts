import { ITask, Task } from "./task.js";
import { IProcMap, AsyncWorkerClient, GenericArguments } from "./types.js";
export default function <const T extends IProcMap>(procMap: T): AsyncWorkerClient<T>;
export declare function task<const T extends readonly unknown[], U extends T, V>(fn: (this: Task<any, any, any>, ...args: GenericArguments<U>) => V, args: T | (() => T)): ITask<T, GenericArguments<U>, V>;
