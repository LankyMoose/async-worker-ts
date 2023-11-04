export class Task<const T extends readonly unknown[], U extends T, R> {
  constructor(public readonly fn: (...args: U) => R, public readonly args: T) {}
}
