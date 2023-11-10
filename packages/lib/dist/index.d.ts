import { ITask, Task } from "./task.js";
import { IProcMap, AsyncWorkerClient } from "./types.js";
export default function <const T extends IProcMap>(procMap: T): AsyncWorkerClient<T>;
export declare function task<const T extends readonly unknown[], U>(fn: (this: Task<any, any>, ...args: T) => U): ITask<T, U>;
