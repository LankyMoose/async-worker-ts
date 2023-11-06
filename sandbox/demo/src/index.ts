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
  gooseChase: async (iterations: number) => {
    let i = 0
    let startTime = Date.now()
    while (i < iterations) {
      i++
      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }

    return Date.now() - startTime
  },
})

async function main() {
  worker
    .calculatePi(100_000_000)
    .onProgress((n) => {
      console.log("progress", n)
    })
    .then((res) => {
      console.log("task complete", res)
    })
    .then(() => worker.exit())

  // await worker.loadUser().then((res) => {
  //   console.log("loadUser", res)
  //   worker.exit()
  // })
}

await main()

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
