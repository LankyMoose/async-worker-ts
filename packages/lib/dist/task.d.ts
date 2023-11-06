export declare class Task<const T extends readonly unknown[], U extends T, V> {
    readonly fn: (...args: U) => V;
    constructor(fn: (...args: U) => V, getArgs: T | (() => T));
    getArgs: () => T;
}
