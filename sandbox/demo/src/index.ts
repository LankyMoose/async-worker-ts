import { settings, worker } from "sandbox-shared"

function playPingPong() {
  return worker.concurrently(async (w) => {
    let i = settings.ping_pong_iters
    return w
      .pingPong()
      .on("ping", () => (--i === 0 ? "pong" : "later, nerd"))
      .then((res) => console.log("task complete", res))
  })
}

//playPingPong()

worker.concurrently(async (w) => {
  const gen = await w.generatorTest()
  for await (let i of gen) {
    console.log(i)
  }
})

// const gen = await worker.generatorTest()

// for await (let i of gen) {
//   console.log(i)
// }
