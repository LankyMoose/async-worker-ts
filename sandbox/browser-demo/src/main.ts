import { AsyncWorkerClient } from "async-worker-ts/dist/types"
import "./style.css"
import useWorker, { reportProgress, task } from "async-worker-ts"

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <button id="btn" type="button">New Task</button>
    <h4 id="total-iterations">Total Iterations: 0</h4>
    <ul style="list-style-type:none;margin:0;padding:0" id="progress-bars"></ul>
`
const btn = document.getElementById("btn")!
const progressBars = document.getElementById("progress-bars")!
const totalIterationsEl = document.getElementById("total-iterations")!

function createTaskUI(w: AsyncWorkerClient<{}>) {
  const li = document.createElement("li")
  const durationText = Object.assign(document.createElement("span"), {
    innerHTML: "0ms",
  })
  const progressBar = Object.assign(document.createElement("progress"), {
    value: 0,
    max: 1,
  })
  const cancelButton = Object.assign(document.createElement("button"), {
    type: "button",
    innerHTML: "Cancel",
    onclick: () => {
      w.exit()
      li.nextElementSibling?.querySelector("button")?.focus()
      li.remove()
      // find all progress bars with value="0"
      // and remove their parent li's
      progressBars.querySelectorAll("progress[value='0']").forEach((p) => {
        p.parentElement?.remove()
      })
    },
  })

  li.append(progressBar, cancelButton, durationText)
  progressBars.appendChild(li)
  return { durationText, progressBar, cancelButton }
}

let totalIterations = 0
const iterationsPerTask = 250_000_000

const worker = useWorker({
  generatorTest: function* (
    argumentValue: number
  ): Generator<Promise<number>, Promise<number>, number> {
    yield this.asyncNumber(1 + argumentValue)
    yield this.asyncNumber(2 + argumentValue)
    return this.asyncNumber(3 + argumentValue)
  },
  asyncNumber: (n: number) =>
    new Promise((res) => setTimeout(() => res(n), 450)) as Promise<number>,
  calculatePi: function (iterations: number) {
    let pi = 0
    for (let i = 0; i < iterations; i++) {
      pi += Math.pow(-1, i) / (2 * i + 1)

      if (i % (iterations / 100) === 0) reportProgress(i / iterations)
    }
    console.log("pi time", this.math.add(21, 21))

    return pi * 4
  },
  math: {
    add: task((a, b) => a + b, [123 as number, 345 as number]),
    subtract: (a: number, b: number) => a - b,
  },
})

const res = worker.generatorTest(1)
console.log(await res.onProgress(console.log))

// @ts-ignore
function syncPie() {
  const { durationText, progressBar, cancelButton } = createTaskUI(worker)
  let startTime = 0
  worker
    .calculatePi(iterationsPerTask)
    .onProgress((n) => {
      if (n === 0) {
        startTime = Date.now()
      }
      progressBar.value = n
      totalIterations += iterationsPerTask / 100
      totalIterationsEl.innerHTML = `Total Iterations: ${totalIterations.toLocaleString()}`
      durationText.innerHTML = Date.now() - startTime + "ms"
    })
    .then(() => {
      progressBar.value = 1
      cancelButton.innerText = "Remove"
    })
}
// @ts-ignore
function concurrentPie() {
  worker.concurrently((w) => {
    const startTime = Date.now()

    const { durationText, progressBar, cancelButton } = createTaskUI(w)

    w.calculatePi(iterationsPerTask)
      .onProgress((n) => {
        progressBar.value = n
        totalIterations += iterationsPerTask / 100
        totalIterationsEl.innerHTML = `Total Iterations: ${totalIterations.toLocaleString()}`
        durationText.innerHTML = Date.now() - startTime + "ms"
      })
      .then(() => {
        progressBar.value = 1
        w.exit()
        cancelButton.innerText = "Remove"
      })
  })
}

btn.addEventListener("click", () => syncPie())
