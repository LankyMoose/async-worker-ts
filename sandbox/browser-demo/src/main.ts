import "./style.css"
import useWorker from "async-worker-ts"

let iterations = 1000

const appEl = document.getElementById("app")!

appEl.appendChild(
  Object.assign(document.createElement("button"), {
    onclick: () => playPingPong(),
    textContent: "Play ping pong",
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
  return {
    progress,
    li,
  }
}

const worker = useWorker({
  generatorTest: function* (): Generator<string, number, string> {
    while ((yield "ping") === "pong");

    return 123 as const
  },
})

function playPingPong() {
  worker.concurrently(async (w) => {
    const { progress, li } = createTaskUi()

    let id = Math.random().toString(36).slice(2)
    let i = iterations
    return w
      .generatorTest()
      .yield(function* (str: string) {
        let a = str
        while ((yield "pong") === "ping" && i-- > 0) {
          console.log("main thread - a", a, id)
          progress.value = iterations - i
        }
        li.remove()
        return undefined
      })
      .then((res) => console.log("task complete", res))
  })
}
