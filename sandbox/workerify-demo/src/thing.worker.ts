import createWorkerClient from "async-worker-ts"
import { createThing } from "./someOtherDep.js"

const thing = createThing()

export default createWorkerClient({
  doTheThing: async () => {
    return thing.doTheThing()
  },
  doTheOtherThing: () => {
    return thing.doTheOtherThing()
  },
})
