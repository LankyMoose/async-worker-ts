export declare class Task<T extends readonly unknown[], R> {
    readonly fn: (...args: T) => R;
    readonly args: T;
    constructor(fn: (...args: T) => R, args: T);
}
