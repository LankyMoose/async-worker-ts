export class Task {
    constructor(fn, args) {
        Object.defineProperty(this, "fn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: fn
        });
        Object.defineProperty(this, "args", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: args
        });
    }
    serialize() {
        return this.fn.toString();
    }
    getArgs() {
        return this.args;
    }
}
