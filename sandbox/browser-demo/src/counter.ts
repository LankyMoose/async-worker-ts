import useWorker, { reportProgress } from "async-worker-ts"

const worker = useWorker({
  calculatePi: (iterations: number) => {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    return pi * 4
  },
  gooseChase: async (iterations: number) => {
    const startTime = Date.now()
    let i = 0
    while (i < iterations) {
      i++
      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }

    return Date.now() - startTime
  },
})

async function main() {
  //await worker.commands.init()
  await worker
    .calculatePi(100_000_000)
    .onProgress((n) => {
      console.log("progress", n)
    })
    .then((res) => {
      console.log("task complete", res)
    })
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
