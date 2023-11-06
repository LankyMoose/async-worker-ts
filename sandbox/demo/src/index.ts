import createWorker, { task, reportProgress } from "async-worker-ts"

const ctx = { id: 1 }

const worker = createWorker({
  test: {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
  },
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },
  loadUser: task(
    async ({ id }) => {
      const user = await fetch(`https://dummyjson.com/users/${id}`)
      return user.json()
    },
    [ctx]
  ),
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
