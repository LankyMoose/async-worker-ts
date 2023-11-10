export interface ITask<T extends readonly unknown[], U> {
  (...args: T): U
}

export class Task<const T extends readonly unknown[], U> {
  constructor(private readonly fn: (this: Task<any, any>, ...args: T) => U) {}

  // @ts-expect-error ts(6133)
  public reportProgress(percent: number): void {}

  static getTaskFn(task: Task<any, any>) {
    return task.fn
  }
}
