# **async-worker-ts** 💪

#### _A type-safe package designed to simplify the usage of worker threads on the server or browser._

<br />

## Usage:

```ts
import createWorker, { task, reportProgress } from "async-worker-ts"

let userId: number = 1

// Calling createWorker() spawns a new worker thread with RPCs generated based on the provided object.

const worker = createWorker({
  /**
   * When called, this will be executed in the worker thread and can
   * receive values from the parent scope as arguments. It can be a
   * normal function or an async function.
   */
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      /**
       * reportProgress() is a function that sends a "progress report" message
       * to the parent scope, which can be handled with onProgress()
       */
      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },

  /**
   * Using task(), you can create a procedure that is automatically
   * provided arguments from the parent scope.
   *
   * The first argument is the function that will be executed in the worker
   * thread, and the second argument is either:
   *    - a function that provides the arguments for the worker function,
   *    - or the arguments themselves.
   */
  loadUser: task(
    async (id /** id is inferred as type number */) => {
      const user = await fetch(`https://dummyjson.com/users/${id}`)
      return user.json()
    },
    () => [userId]
  ),

  /**
   * You can also nest/group procedures as deep as you want.
   */
  todos: {
    get: () => {
      // ...
    },
    add: () => {
      // ...
    },
    delete: () => {
      // ...
    },
  },
})

/**
 * Calling a procedure returns a ProcedurePromise that resolves to its
 * return value.
 * While the procedure is running, it can be used to listen to progress reports.
 */
await worker
  .calculatePi(1_000_000_000)
  .onProgress(console.log) // 0, 0.01, 0.02, ..., 0.99
  .then(console.log) // 3.14159265258979

await worker.loadUser().then(console.log) // { id: 1, name: 'John Doe', ... }

await worker.exit() // terminates the worker thread
```
