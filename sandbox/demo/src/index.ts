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

async function main() {
  const num = await worker.add(1, 2)
  const user = await worker.getUser(1)
  console.log(num, user)
  await worker.deInit()
}

main()
