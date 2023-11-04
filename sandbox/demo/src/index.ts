import useWorker, { task } from "async-worker-ts"

let num = 0

const worker = useWorker({
  add: async (a: number, b: number) => a + b,
  add2: task(
    (a, b) => a + b,
    () => [num, 0]
  ),
  calculatePi: async () => {
    let pi = 0
    for (let i = 0; i < 1000000000; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
    }
    return pi * 4
  },
})

function main() {
  worker.add2().then((res) => {
    console.log("add2", res)
    if (res < 10) {
      num++
      sleep(250).then(main)
    } else {
      worker.exit()
    }
  })
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

main()

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
