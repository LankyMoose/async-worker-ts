import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  generatorTest: function* (
    argumentValue: number
  ): Generator<Promise<number>, Promise<number>, number> {
    yield this.asyncNumber(1 + argumentValue)
    yield this.asyncNumber(2 + argumentValue)
    return this.asyncNumber(3 + argumentValue)
  },
  asyncNumber: (n: number) =>
    new Promise((res) => setTimeout(() => res(n), 450)) as Promise<number>,
  calculatePi: async function (iterations: number) {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }

    console.log("pi time", this.math.add(420, 69))

    return pi * 4
  },
  math: {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
  },
})

async function main() {
  await worker
    .calculatePi(100_000_000)
    .onProgress((n) => console.log("progress", n))
    .then(async (res) => console.log("task complete", res))

  // await worker
  //   .generatorTest(1)
  //   .onProgress((n) => console.log("progress", n))
  //   .then(async (res) => console.log("task complete", res))
}

await main()
worker.exit()

// await Promise.all([
//   //worker.add(1, 2).then(console.log),
//   //worker.getUser(1).then(console.log),
//   //worker.calculatePi().then(console.log),
//   ,
// ])

//await worker.exit()

// const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// sleep(50)

//process.exit()
