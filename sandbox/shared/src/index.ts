import createWorkerClient, { task } from "async-worker-ts"

export const settings = {
  pi_iters: 100_000_000,
  ping_pong_iters: 10_000,
}

export async function* generatorTest(): AsyncGenerator<string> {
  try {
    const yieldInputA = yield "a"
    console.log("generatorTest yield input", yieldInputA)
    yield* ["a", "b", "c"] as any
    yield "d"
    yield "e"
    return "f"
  } catch (error) {
    console.log("generatorTest caught er", error)
    yield "g"
    yield "h"
  } finally {
    console.log("generatorTest finally")
    yield "i"
    yield "j"
    return "k"
  }
}

export const worker = createWorkerClient({
  generatorTest,
  pingPong: task(async function () {
    while ((await this.emit("ping")) === "pong");

    return 123
  }),

  calculatePi: task(function (iterations: number) {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) this.emit("progress", i / iterations)
    }
    return pi * 4
  }),
  slowClap: task(function (ms: number = 500) {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (await this.emit("continue")) return
        clearInterval(interval)
        resolve(true)
      }, ms)
    })
  }),
})
