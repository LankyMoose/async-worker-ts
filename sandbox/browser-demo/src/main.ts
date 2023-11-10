import "./style.css"
import { worker, settings } from "sandbox-shared"

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
    max: 1,
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

    progress.max = settings.ping_pong_iters

    let i = settings.ping_pong_iters
    return w
      .generatorTest()
      .yield(function* () {
        while ((yield "pong") === "ping" && i-- > 0) {
          progress.value = settings.ping_pong_iters - i
        }
        li.remove()
      })
      .then((res) => console.log("task complete", res))
  })
}

function calculatePi() {
  worker.concurrently(async (w) => {
    const { progress, li } = createTaskUi()
    progress.max = settings.pi_iters

    return w
      .calculatePi()
      .onProgress((p) => {
        progress.value = p * settings.pi_iters
      })
      .then((res) => {
        console.log("task complete", res)
        li.remove()
      })
  })
}
