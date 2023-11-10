export class Task {
    fn;
    constructor(fn) {
        this.fn = fn;
    }
    // @ts-expect-error ts(6133)
    reportProgress(percent) { }
    static getTaskFn(task) {
        return task.fn;
    }
}
