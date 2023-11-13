export class Task<const T extends readonly unknown[], U> {
  #fn: (this: Task<any, any>, ...args: T) => U
  constructor(fn: (this: Task<any, any>, ...args: T) => U) {
    this.#fn = fn
  }

  // @ts-ignore ts(6133) ts(2355)
  emit(event: string, data?: any): Promise<unknown> {
    throw new Error(
      "emit() should only be called from within a worker task function"
    )
  }

  static getTaskFn(task: Task<any, any>) {
    return task.#fn
  }
}
