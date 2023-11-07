export class Task {
    fn;
    constructor(fn, getArgs) {
        this.fn = fn;
        this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs;
    }
    getArgs;
    static new(fn, args) {
        const instance = new Task(fn, args);
        return Object.assign((...args) => instance.fn(...args), instance);
    }
}
