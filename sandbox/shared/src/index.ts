import createWorkerClient, { reportProgress } from "async-worker-ts"

export const worker = createWorkerClient({
  generatorTest: function* (): Generator<string, number, string> {
    while ((yield "ping") === "pong");

    return 123
  },

  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },
})
