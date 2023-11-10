export declare class Task<const T extends readonly unknown[], U> {
    private readonly fn;
    constructor(fn: (this: Task<any, any>, ...args: T) => U);
    emit(event: string, data?: any): Promise<unknown>;
    static getTaskFn(task: Task<any, any>): (this: Task<any, any>, ...args: any) => any;
}
