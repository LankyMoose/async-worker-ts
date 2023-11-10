export class Task {
    fn;
    constructor(fn) {
        this.fn = fn;
    }
    // @ts-ignore ts(6133) ts(2355)
    emit(event, data) {
        throw new Error("emit() should only be called from within a worker task function");
    }
    static getTaskFn(task) {
        return task.fn;
    }
}
