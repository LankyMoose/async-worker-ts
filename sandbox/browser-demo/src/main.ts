import "./style.css"
import { worker, settings } from "sandbox-shared"

const appEl = document.getElementById("app")!

function addTaskButton(label: string, cb: () => void) {
  return Object.assign(document.createElement("button"), {
    onclick: cb,
    textContent: label,
  })
}

appEl.append(
  addTaskButton("Ping pong", () => playPingPong()),
  addTaskButton("Calculate pi", () => calculatePi()),
  addTaskButton("Slow clap", () => slowClap())
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
      .pingPong()
      .on("ping", () => {
        progress.value = settings.ping_pong_iters - i
        if (--i > 0) return "pong"
        li.remove()
      })
      .then((res) => console.log("task complete", res))
  })
}

function calculatePi() {
  worker.concurrently(async (w) => {
    const { progress, li } = createTaskUi()
    progress.max = settings.pi_iters

    //console.log(w.calculatePi(2))

    return w
      .calculatePi(settings.pi_iters)
      .on("progress", (p: number) => {
        progress.value = p * settings.pi_iters
      })
      .then((res) => {
        console.log("task complete", res)
        li.remove()
      })
  })
}

function slowClap() {
  let claps = 10
  worker
    .slowClap()
    .on("continue", () => {
      console.log("continue?")
      const el = createClapEl()
      document.body.appendChild(el)
      return --claps > 0
    })
    .then(() => {
      console.log("task complete")
    })
}

function createClapEl() {
  const el = Object.assign(document.createElement("span"), {
    innerText: "👏",
    className: "clap",
    style: `
      position: absolute;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      transform: translate(-50%, -50%);
      font-size: ${Math.random() * 20 + 20}px;
    `,
    onanimationend: () => el.remove(),
  })

  return el
}
