import { settings, worker } from "sandbox-shared"

function playPingPong() {
  return worker.concurrently(async (w) => {
    let i = settings.ping_pong_iters
    return w
      .generatorTest()
      .yield(function* () {
        while ((yield "pong") === "ping" && i-- > 0);
      })
      .then((res) => console.log("task complete", res))
  })
}

await playPingPong()
worker.exit()

// await Promise.all([
//   //worker.add(1, 2).then(console.log),
//   //worker.getUser(1).then(console.log),
//   //worker.calculatePi().then(console.log),
//   ,
// ])

//await worker.exit()

// const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

// sleep(50)

//process.exit()
