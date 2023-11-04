export class Task<const T extends readonly unknown[], U extends T, V> {
  constructor(public readonly fn: (...args: U) => V, public args: T) {}
  getArgs(): T {
    return this.args
  }

  toString() {
    return this.fn.toString()
  }
}
