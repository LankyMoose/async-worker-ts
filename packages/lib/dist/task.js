export class Task {
    fn;
    getArgs;
    constructor(fn, getArgs) {
        this.fn = fn;
        this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs;
    }
    // @ts-expect-error ts(6133)
    reportProgress(percent) { }
    static getTaskArgs(task) {
        return task.getArgs();
    }
    static getTaskFn(task) {
        return task.fn;
    }
}
