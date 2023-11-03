import useWorker from "async-worker-ts"

const add = async (a: number, b: number) => a + b
const getUser = async (userId: number) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  )
  return response.json()
}

const worker = useWorker({ add, getUser })

async function main() {
  //await worker.commands.init()
  await Promise.all([
    worker.add(1, 2).then(console.log),
    worker.getUser(1).then(console.log),
  ])
  await worker.exit()
}

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `count is ${counter}`
  }
  element.addEventListener("click", () => {
    setCounter(counter + 1)
    main()
  })
  setCounter(0)
}
