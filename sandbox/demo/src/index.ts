import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  generatorTest: function* (): Generator<number, number, number> {
    console.log("worker - 1")
    const a = yield 1 // 2
    console.log("worker - 2", a)
    const b = yield 2 // 4
    console.log("worker - 3", b)
    return a + b // 6
  },
})

async function main() {
  await worker
    .generatorTest()
    .onYield(async (n) => n * 2)
    .then((res) => console.log("task complete", res))
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
