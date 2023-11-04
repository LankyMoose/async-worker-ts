export class Task {
    fn;
    args;
    constructor(fn, args) {
        this.fn = fn;
        this.args = args;
    }
    serialize() {
        return this.fn.toString();
    }
    getArgs() {
        return this.args;
    }
}
