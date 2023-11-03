import useWorker from "async-worker-ts"

const worker = useWorker({
  add: async (a: number, b: number) => a + b,
  getUser: async (userId: number) => {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userId}`
    )
    return response.json()
  },
})

await Promise.all([
  worker.add(1, 2).then(console.log),
  worker.getUser(1).then(console.log),
])

worker.exit()

// const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// sleep(50)

//process.exit()
