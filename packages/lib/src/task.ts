export class Task<const T extends readonly unknown[], U extends T, V> {
  constructor(public readonly fn: (...args: U) => V, getArgs: T | (() => T)) {
    this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs
  }
  getArgs: () => T

  toString() {
    return this.fn.toString()
  }
}
