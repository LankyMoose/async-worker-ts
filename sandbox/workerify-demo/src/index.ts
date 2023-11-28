import thingWorker from "./thing.worker.js"

async function main() {
  const thing1 = await thingWorker.doTheThing()
  console.log(thing1)
  const thing2 = await thingWorker.doTheOtherThing()
  console.log(thing2)
  await thingWorker.exit()
}

main()
