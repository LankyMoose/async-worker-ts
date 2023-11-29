import { procMap } from "sandbox-shared"
import createWorker from "async-worker-ts"

const num = 123

const pm = Object.assign<typeof procMap, { teeest: () => number }>(procMap, {
  teeest: () => {
    console.log("teeest")
    return num
  },
})

export default createWorker(pm)
