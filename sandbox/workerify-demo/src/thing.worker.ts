import asd, { task } from "async-worker-ts"
import { createThing } from "./someOtherDep.js"

const thing = createThing()
const c = asd({
  // @ts-ignore
  taskTest: task(async (a, b) => a + b),
  doTheThing: async () => {
    return thing.doTheThing()
  },
  doTheOtherThing: () => {
    return thing.doTheOtherThing()
  },
})

export default c

//export { client as default }
