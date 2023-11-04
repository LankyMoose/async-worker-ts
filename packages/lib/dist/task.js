export class Task {
    fn;
    args;
    constructor(fn, args) {
        this.fn = fn;
        this.args = args;
    }
    getArgs() {
        return this.args;
    }
    toString() {
        return this.fn.toString();
    }
}
