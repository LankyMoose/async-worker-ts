import useWorker, { task } from "async-worker-ts"

const ctx = { id: 1 }

const worker = useWorker({
  calculatePi: () => {
    let pi = 0
    for (let i = 0; i < 100_000_000; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
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

function main() {
  worker.loadUser().then((res) => {
    console.log("loadUser", res)
    if (ctx.id < 3) {
      ctx.id++
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
