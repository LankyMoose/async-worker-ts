import { GenericArguments } from "./types"

export interface ITask<
  T extends readonly unknown[],
  U extends GenericArguments<T>,
  V
> {
  fn: (...args: U) => V
  getArgs: () => T
  (...args: U): V
}

export class Task<
  const T extends readonly unknown[],
  U extends GenericArguments<T>,
  V
> {
  constructor(public readonly fn: (...args: U) => V, getArgs: T | (() => T)) {
    this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs
  }
  public getArgs: () => T
}
