# **async-worker-ts** 💪

#### _A package designed to simplify the usage of Worker threads in Node and the browser._

<br />

## Usage:

```ts
import useWorker from "async-worker-ts"

const worker = useWorker({
  add: (a: number, b: number) => a + b,
  calculatePi: () => {
    let pi = 0
    for (let i = 0; i < 1000000000; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
    }
    return pi * 4
  },
})

worker.add(1, 2).then(console.log) // 3
worker.calculatePi().then(console.log) // 3.1415926525880504
```

## _Concessions_

Functions passed to the worker are stringified and then parsed in the worker thread. This means that you can't pass functions that are not serializable (e.g. functions that reference variables outside of their scope).

Variables passed to worker functions must be serializable. This means that you can't pass objects that reference functions.
