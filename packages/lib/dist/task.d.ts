export declare class Task<const T extends readonly unknown[], U extends T, R> {
    readonly fn: (...args: U) => R;
    readonly args: T;
    constructor(fn: (...args: U) => R, args: T);
}
