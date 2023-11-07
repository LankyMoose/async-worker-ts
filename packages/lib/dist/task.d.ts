export interface ITask<T extends readonly unknown[], U extends T, V> {
    fn: (...args: U) => V;
    getArgs: () => T;
    (...args: U): V;
}
export declare class Task<const T extends readonly unknown[], U extends T, V> {
    readonly fn: (...args: U) => V;
    constructor(fn: (...args: U) => V, getArgs: T | (() => T));
    getArgs: () => T;
    static new<const T extends readonly unknown[], U extends T, V>(fn: (...args: U) => V, args: T | (() => T)): ITask<T, U, V>;
}
