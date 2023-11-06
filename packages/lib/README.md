# **async-worker-ts** 💪

#### _A type-safe package designed to simplify the usage of worker threads on the server or browser._

<br />

## Usage:

```ts
import createWorker, { task } from "async-worker-ts"

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
    let i = 0

    do {
      pi += Math.pow(-1, i) / (2 * i + 1)
      i++
    } while (i < iterations)

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

// Calling a procedure returns a promise that resolves to its return value.

const pi = await worker.calculatePi(1_000_000_000) // pi is inferred as type number
console.log(pi) // 3.1415926525880504

await worker.loadUser().then(console.log) // { id: 1, name: 'John Doe', ... }

await worker.exit() // terminates the worker thread
```
