import { Task } from "./task.js";
import { IProcMap, UseWorkerResult } from "./types.js";
export default function useWorker<const T extends IProcMap>(procMap: T): UseWorkerResult<T>;
export declare function task<const T extends readonly unknown[], U extends T, V>(fn: (...args: U) => V, args: T | (() => readonly [...T])): Task<T, U, V>;
