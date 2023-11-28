import { settings } from "sandbox-shared"
import worker from "./myWorker.worker.js"

function playPingPong() {
  return worker.concurrently(async (w) => {
    let i = settings.ping_pong_iters
    return w
      .pingPong()
      .on("ping", () => (--i === 0 ? "pong" : "later, nerd"))
      .then((res) => console.log("task complete", res))
  })
}

await playPingPong()

const depTest = await worker.dependancyTest()
console.log("depTest", depTest)

const gen = await worker.generatorTest()

for await (let i of gen) {
  console.log(i)
}

worker.exit()
