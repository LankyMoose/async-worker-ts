export interface ITask<T extends readonly unknown[], U> {
    (...args: T): U;
}
export declare class Task<const T extends readonly unknown[], U> {
    private readonly fn;
    constructor(fn: (this: Task<any, any>, ...args: T) => U);
    reportProgress(percent: number): void;
    static getTaskFn(task: Task<any, any>): (this: Task<any, any>, ...args: any) => any;
}
