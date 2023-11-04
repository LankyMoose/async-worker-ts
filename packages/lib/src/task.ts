export class Task<T extends readonly unknown[], R> {
  constructor(public readonly fn: (...args: T) => R, public readonly args: T) {}
}
