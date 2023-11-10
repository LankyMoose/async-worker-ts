import { GenericArguments } from "./types"

export interface ITask<
  T extends readonly unknown[],
  U extends GenericArguments<T>,
  V
> {
  (this: Task<any, any, any>, ...args: U): V
}

export class Task<
  const T extends readonly unknown[],
  U extends GenericArguments<T>,
  V
> {
  private getArgs: () => T
  constructor(
    private readonly fn: (this: Task<any, any, any>, ...args: U) => V,
    getArgs: T | (() => T)
  ) {
    this.getArgs = typeof getArgs === "function" ? getArgs : () => getArgs
  }

  // @ts-expect-error ts(6133)
  public reportProgress(percent: number): void {}

  static getTaskArgs(task: Task<any, any, any>) {
    return task.getArgs()
  }
  static getTaskFn(task: Task<any, any, any>) {
    return task.fn
  }
}
