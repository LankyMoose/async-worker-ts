export declare class Task<const T extends readonly unknown[], U extends T, V> {
    readonly fn: (...args: U) => V;
    args: T;
    constructor(fn: (...args: U) => V, args: T);
    getArgs(): T;
    toString(): string;
}
