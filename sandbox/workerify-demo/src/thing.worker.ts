import asd, { task } from "async-worker-ts"
import { createThing } from "./someOtherDep.js"
import { add } from "./some-folder/someModule.js"

const thing = createThing()

export default asd({
  taskTest: task(async (a: number, b: number) => a + b),
  doTheThing: async () => {
    return thing.doTheThing()
  },
  doTheOtherThing: () => {
    return thing.doTheOtherThing()
  },
  cvs: (_canvas: OffscreenCanvas) => {},
  doAnotherThing: (n: number) => (add(n, 1) * 42) / 2,
})
