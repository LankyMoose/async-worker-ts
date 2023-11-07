import { GenericArguments } from "./types";
export interface ITask<T extends readonly unknown[], U extends GenericArguments<T>, V> {
    fn: (...args: U) => V;
    getArgs: () => T;
    (...args: U): V;
}
export declare class Task<const T extends readonly unknown[], U extends GenericArguments<T>, V> {
    readonly fn: (...args: U) => V;
    constructor(fn: (...args: U) => V, getArgs: T | (() => T));
    getArgs: () => T;
}
