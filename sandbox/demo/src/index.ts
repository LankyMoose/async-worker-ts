import useWorker from "async-worker-ts"

const worker = useWorker({
  add: async (a: number, b: number) => a + b,
  getUser: async (userId: number) => {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`
    )
    return response.json()
  },
  calculatePi: async () => {
    let pi = 0
    for (let i = 0; i < 1000000000; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
    }
    return pi * 4
  },
})

await Promise.all([
  worker.add(1, 2).then(console.log),
  worker.getUser(1).then(console.log),
  worker.calculatePi().then(console.log),
])

worker.exit()

// const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// sleep(50)

//process.exit()
