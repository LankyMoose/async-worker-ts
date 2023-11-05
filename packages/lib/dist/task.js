export class Task {
    fn;
    constructor(fn, getArgs) {
        this.fn = fn;
        this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs;
    }
    getArgs;
    toString() {
        return this.fn.toString();
    }
}
