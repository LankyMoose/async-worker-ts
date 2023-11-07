# **async-worker-ts** 🔱

#### _A type-safe package designed to simplify the usage of worker threads on the server or browser._

<br />

## Usage:

```ts
import createWorker, { task, reportProgress } from "async-worker-ts"

const worker = createWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },

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
 * While the procedure is running, it can be used to listen to progress
 * reports.
 */
await worker
  .calculatePi(1_000_000)
  .onProgress(console.log) // 0, 0.01, 0.02, ..., 0.99
  .then(console.log) // 3.14159265258979

await worker.exit() // terminates the worker thread
```

<br />

## Accessing procedures within procedures:

```ts
import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  /**
   * NB; the 'this' keyword is available in procedures declared as anything but arrow functions and can be used to access other procedures.
   */
  addRandomNumbers: function () {
    const a = this.randomNumber()
    const b = this.randomNumber()
    return a + b
  },
  randomNumber: () => {
    return Math.random()
  },
})
```

<br />

## Concurrency and batching:

```ts
import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },
})

/**
 * We can use the 'concurrently' method to run a task from the worker
 * client in a new auto-disposed worker thread.
 */
worker.concurrently((w) => w.calculatePi(1_000_000)) // 3.14159265258979

/** or: */
for (let i = 0; i < 4; i++) {
  worker.concurrently((w) => w.calculatePi(1_000_000))
}
```

<br />

# God help your CPU. 🙏

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmc4dm1zazE4OXpmcWxtcXByOWp1a3F5cGJicTc1eHZvYTBvZXQxOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dbtDDSvWErdf2/giphy.gif" alt="Richard Ayoade using async-worker-ts" />

</p>
