import { useWorker } from "async-worker-ts"

let userId = 1

const loadTodos = async () => {
  const todos = await fetch("https://jsonplaceholder.typicode.com/todos", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userId}`,
    },
  })
  return todos.json()
}

async function main() {
  const num = await useWorker(async () =>
    loadTodos().then((todos) => todos.length)
  )
  console.log(num)
}

main()
