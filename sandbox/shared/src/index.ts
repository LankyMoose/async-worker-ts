import createWorkerClient, { task } from "async-worker-ts"

export const settings = {
  pi_iters: 100_000_000,
  ping_pong_iters: 10_000,
}

export const worker = createWorkerClient({
  generatorTest: function* (): Generator<string, number, string> {
    while ((yield "ping") === "pong");

    return 123
  },

  calculatePi: task(
    function (iterations: number) {
      let pi = 0
      for (let i = 0; i < iterations; i++) {
        pi += Math.pow(-1, i) / (2 * i + 1)

        if (i % (iterations / 100) === 0) this.reportProgress(i / iterations)
      }
      return pi * 4
    },
    [settings.pi_iters]
  ),
})

//worker.calculatePi(100000000)
