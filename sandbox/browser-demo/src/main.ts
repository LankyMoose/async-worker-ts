import "./style.css"
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

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <button id="btn" type="button">New Task</button>
    <h4 id="total-iterations">Total Iterations: 0</h4>
    <ul style="list-style-type:none;margin:0;padding:0" id="progress-bars"></ul>
`
const btn = document.getElementById("btn")!
const progressBars = document.getElementById("progress-bars")!
const totalIterationsEl = document.getElementById("total-iterations")!

let totalIterations = 0
const iterationsPerTask = 250_000_000

btn.addEventListener("click", () => {
  const w = worker.clone()
  const startTime = Date.now()

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
      // focus the sibling li -> button
      // @ts-ignore
      li.nextElementSibling?.querySelector("button").focus()

      li.remove()
    },
  })

  li.append(progressBar, cancelButton, durationText)
  progressBars.appendChild(li)

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
