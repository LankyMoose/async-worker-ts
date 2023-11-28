import { transfer } from "async-worker-ts"
import "./style.css"
import { worker, settings } from "sandbox-shared"

const appEl = document.getElementById("app")!

function createButton(label: string, cb: () => void) {
  return Object.assign(document.createElement("button"), {
    onclick: cb,
    textContent: label,
  })
}

appEl.append(
  createButton("Ping pong", () => playPingPong()),
  createButton("Calculate pi", () => calculatePi()),
  createButton("Slow clap", () => slowClap()),
  createButton("Offscreen canvas", () => offscreenCanvas()),
  createButton("Doubler", () => doDoublerTest()),
  createButton("Doubler chunked", () => doDoublerTest(true))
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
// @ts-ignore
async function testGenerator(gen: AsyncGenerator) {
  const nxt = await gen.next()
  console.log("nxt", nxt)
  // const err = await gen.throw(new Error("test"))
  // console.log("err", err)

  // const ret = await gen.return("main t return")
  // console.log("ret", ret)
  const nxt2 = await gen.next([4, 1])
  console.log("nxt2", nxt2)
  const nxt3 = await gen.next()
  console.log("nxt3", nxt3)
  const nxt4 = await gen.next()
  console.log("nxt4", nxt4)
  const nxt5 = await gen.next()
  console.log("nxt5", nxt5)

  for await (const val of gen) {
    console.log("val", val)
  }
}

function offscreenCanvas() {
  const canvas = document.createElement("canvas")!
  document.body.appendChild(canvas)
  const offscreenCvs = canvas.transferControlToOffscreen()

  worker.drawToCanvas(transfer(offscreenCvs)).on("continue", () => true)
}

async function doubler(length: number) {
  const list = Array.from({ length }, (_, i) => i + 1) as number[]
  const start = performance.now()

  await worker.doubleItems(list)

  return performance.now() - start
}

async function doubler_chunked(length: number, numThreads: number) {
  const chunkSize = length / numThreads

  const list = Array.from({ length }, () => 1) as number[]
  const start = performance.now()

  await Promise.all(
    Array.from({ length: length / chunkSize }, (_, i) =>
      worker.concurrently((w) =>
        w.doubleItems(list.slice(i * chunkSize, (i + 1) * chunkSize))
      )
    )
  )

  return performance.now() - start
}

async function doDoublerTest(chunked = false) {
  const iterations = 10
  const durations = []
  const arrSize = 4_000_000
  const numThreads = 4

  for (let i = 0; i < iterations; i++) {
    const duration = await (chunked
      ? doubler_chunked(arrSize, numThreads)
      : doubler(arrSize))
    durations.push(duration)
  }
  const shortest = Math.min(...durations)
  const average = durations.reduce((a, b) => a + b) / durations.length
  console.table({
    iterations,
    ["shortest (ms)"]: Math.floor(shortest),
    ["average (ms)"]: Math.floor(average),
    chunked,
  })
}

// await testGenerator(await worker.generatorTest())

// console.log("_______________________________________________________")

// await testGenerator(generatorTest())
