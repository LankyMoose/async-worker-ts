import "./style.css"
import { worker } from "sandbox-shared"

const iterations = 10_000

const appEl = document.getElementById("app")!

appEl.append(
  Object.assign(document.createElement("button"), {
    onclick: () => playPingPong(),
    textContent: "Ping pong",
  }),
  Object.assign(document.createElement("button"), {
    onclick: () => calculatePi(),
    textContent: "Pi time",
  })
)

const currentTasksEl = appEl.appendChild(document.createElement("ul"))

const createTaskUi = () => {
  const progress = Object.assign(document.createElement("progress"), {
    max: iterations,
    value: 0,
  })

  const li = document.createElement("li")
  li.appendChild(progress)
  currentTasksEl.appendChild(li)
  return { progress, li }
}

function playPingPong() {
  worker.concurrently(async (w) => {
    const { progress, li } = createTaskUi()

    let i = iterations
    return w
      .generatorTest()
      .yield(function* () {
        while ((yield "pong") === "ping" && i-- > 0) {
          progress.value = iterations - i
        }
        li.remove()
      })
      .then((res) => console.log("task complete", res))
  })
}

function calculatePi() {
  worker.concurrently(async (w) => {
    const { progress, li } = createTaskUi()
    progress.max = 100_000_000
    const pi_iters = 100_000_000

    return w
      .calculatePi(pi_iters)
      .onProgress((p) => {
        progress.value = p * pi_iters
      })
      .then((res) => {
        console.log("task complete", res)
        li.remove()
      })
  })
}
