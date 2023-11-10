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

playPingPong()
