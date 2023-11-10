export class Task {
    fn;
    getArgs;
    constructor(fn, getArgs) {
        this.fn = fn;
        this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs;
    }
    reportProgress(_percent) { }
    static getTaskArgs(task) {
        return task.getArgs();
    }
    static getTaskFn(task) {
        return task.fn;
    }
}
