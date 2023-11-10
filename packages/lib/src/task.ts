export class Task<const T extends readonly unknown[], U> {
  constructor(private readonly fn: (this: Task<any, any>, ...args: T) => U) {}

  // @ts-ignore ts(6133) ts(2355)
  emit(event: string, data?: any): Promise<unknown> {
    throw new Error(
      "emit() should only be called from within a worker task function"
    )
  }

  static getTaskFn(task: Task<any, any>) {
    return task.fn
  }
}
