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
})

async function main() {
  console.log("starting task")
  worker
    .calculatePi(100_000_000)
    .onProgress((n) => console.log("progress", n))
    .then((res) => {
      console.log("task complete", res)
    })
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
