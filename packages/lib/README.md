# **async-worker-ts** 💪

#### _A completely type-safe package designed to simplify the usage of Worker threads in Node and the browser._

<br />

## Usage:

```ts
import useWorker, { task } from "async-worker-ts"

let userId: number = 1

const worker = useWorker({
  /**
   * This function will be executed in a worker thread.
   * It can be a normal function or an async function,
   * but does not have access to the parent scope.
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
   * Using task(), you can create a 'prepared' worker function that has access
   * to parent scope variables that you provide.
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
})

const pi = await worker.calculatePi(1_000_000_000) // pi is inferred as type number
console.log(pi) // 3.1415926525880504

await worker.loadUser().then(console.log) // { id: 1, name: 'John Doe', ... }

await worker.exit() // terminates the worker thread
```
