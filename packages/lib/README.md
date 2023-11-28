# **async-worker-ts** 🔱

#### _A type-safe package designed to simplify the usage of worker threads on the server or browser._

<br />

## Usage:

```ts
import createWorker, { task } from "async-worker-ts"

const worker = createWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
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

await worker.calculatePi(1_000_000).then(console.log) // 3.14159265258979
await worker.exit() // terminates the worker thread
```

<br />

## Accessing procedures within procedures:

```ts
import createWorker from "async-worker-ts"

const worker = createWorker({
  /**
   * NB; the 'this' keyword is available in procedures declared as anything
   * but arrow functions and can be used to access other procedures.
   */
  addRandomNumbers: function () {
    const a = this.randomNumber()
    const b = this.randomNumber()
    return a + b
  },
  randomNumber: () => {
    return Math.random() * 42
  },
})
```

<br />

## Emitting data via Tasks:

```ts
import createWorker, { task } from "async-worker-ts"

const worker = createWorker({
  calculatePi: task(function (iterations: number) {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      // the "this" keyword in the context of a task refers to the task itself.
      if (i % (iterations / 100) === 0) this.emit("progress", i / iterations)
    }
    return pi * 4
  }),
})

await worker
  .calculatePi(1_000_000)
  .on("progress", console.log) // 0.01, 0.02, ...
  .then(console.log) // 3.14159265258979
```

<br />

## Concurrency and batching:

```ts
import createWorker from "async-worker-ts"

const worker = createWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
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

## Transferables:

```ts
import createWorker, { transfer } from "async-worker-ts"

const worker = createWorker({
  drawToCanvas: (OffscreenCanvas) => {
    // ... do things with the canvas here as if we were on the main thread
  },
})
const canvas = document.createElement("canvas")
const offscreenCvs = canvas.transferControlToOffscreen()

/**
 * By passing the argument through the 'transfer' function, we flag it as an
 * transferable. This is the equivalent of calling 'postMessage' with the
 * second argument being an array containing the argument.
 */
worker.drawToCanvas(transfer(offscreenCvs))
```

<br />

## Advaced Usage (with bundler support):

I created <b><a href="https://www.npmjs.com/package/awt-workerify">awt-workerify</a></b> for this package to enable the power of easy-to-write, easy-to-reason-about workers. It's really simple! By using the very popular <b><a href="https://www.npmjs.com/package/esbuild">esbuild</a></b> package to bundle our worker scripts and their dependencies into a single file, and <b><a href="https://www.npmjs.com/package/esprima">esprima</a></b> for a little bit of code generation magic, we can

- <b>use the same esm import syntax</b> we're used to in regular javascript, and without the need for dynamic imports (except when you want to, of course!)
- <b>make use of the parent scope</b> _(i.e. the scope in which the worker is created)_ to access variables and functions

<br />

_someModule.ts:_

```ts
export const add = (...values: number[]) => {
  return values.reduce((a, b) => a + b, 0)
}
```

_myWorker.<b>worker</b>.ts:_

<small>(note the <b>.worker</b> extension - this allows the bundler to discover the file and generate a companion script)</small>

```ts
import createWorker from "async-worker-ts"
import { add } from "./someModule.js"

const multiplier = 2

const worker = createWorker({
  doSomething: () => {
    return add(6, 7, 8) * multiplier
  },
})

export default worker
```

_main.ts:_

```ts
import worker from "./myWorker.worker.js"

worker.doSomething().then(console.log) // 42
```

_package.json:_

```json
{
  "scripts": {
    "build": "tsc && awt-workerify src dist",
    "dev": "pnpm build && node dist/main.js"
  },
  "dependencies": {
    "async-worker-ts": "*"
  },
  "devDependencies": {
    "awt-workerify": "*"
  }
}
```

<br />

# God help your CPU 😀

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmc4dm1zazE4OXpmcWxtcXByOWp1a3F5cGJicTc1eHZvYTBvZXQxOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dbtDDSvWErdf2/giphy.gif" alt="Richard Ayoade using async-worker-ts" />

</p>
