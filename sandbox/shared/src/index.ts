import createClient, { task, AWTClientBuilder } from "async-worker-ts"

export const settings = {
  pi_iters: 100_000_000,
  ping_pong_iters: 10_000,
}

export const builderWorker = new AWTClientBuilder()
  .withImportCache(async () => {
    const { test } = await import("./test.js")
    return { test }
  })
  .build(function ({ test }) {
    return {
      taskTest: task(async () => 123),
      foo: async () => {
        return test()
      },
      bar: function () {
        return this.foo()
      },
      a: {
        asd: () => 123,
      },
    }
  })

export const worker = createClient({
  dependancyTest: async function () {
    const { test } = await import("./test.js")
    return test()
  },
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
  drawToCanvas: task(async function (canvas: OffscreenCanvas) {
    const ctx = canvas.getContext("2d")!
    let startTime = Date.now()

    const draw = async () => {
      const now = Date.now()
      const dt = (now - startTime) / 1000

      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "white"
      ctx.font = "48px serif"
      ctx.fillText(`Time: ${dt.toFixed(2)}`, 10, 50)
    }

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms))

    while (await this.emit("continue")) {
      draw()
      await sleep(1000 / 60)
    }
  }),
  doubleItems: (items: number[]) => items.map((i) => i * 2),
})

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
