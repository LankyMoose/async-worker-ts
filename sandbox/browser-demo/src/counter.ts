import useWorker, { task } from "async-worker-ts"

let userId = 1

const worker = useWorker({
  calculatePi: () => {
    let pi = 0
    for (let i = 0; i < 1_000_000; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)
    }
    return pi * 4
  },
  loadUser: task(
    async (id) => {
      const user = await fetch(`https://dummyjson.com/users/${id}`)
      return user.json()
    },
    () => [userId]
  ),
})

async function main() {
  //await worker.commands.init()
  await Promise.all([
    worker.loadUser().then(console.log),
    worker.calculatePi().then(console.log),
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
