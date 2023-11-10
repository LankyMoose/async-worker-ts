import { GenericArguments } from "./types";
export interface ITask<T extends readonly unknown[], U extends GenericArguments<T>, V> {
    (this: Task<any, any, any>, ...args: U): V;
}
export declare class Task<const T extends readonly unknown[], U extends GenericArguments<T>, V> {
    private readonly fn;
    private getArgs;
    constructor(fn: (this: Task<any, any, any>, ...args: U) => V, getArgs: T | (() => T));
    reportProgress(_percent: number): void;
    static getTaskArgs(task: Task<any, any, any>): any;
    static getTaskFn(task: Task<any, any, any>): (this: Task<any, any, any>, ...args: any) => any;
}
