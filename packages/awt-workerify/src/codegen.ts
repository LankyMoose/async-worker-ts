import esprima from "esprima"
import escodegen from "escodegen"
import type { Node as EsNode } from "estree"

type traverseState = {
  importName: string
  didAddArg: boolean
}
function traverse(node: EsNode, id: string, state: traverseState): void {
  if (
    node.type === "ImportDeclaration" &&
    node.source.value === "async-worker-ts"
  ) {
    for (const n of node.specifiers) {
      if (n.type === "ImportDefaultSpecifier") {
        state.importName = n.local.name
        break
      }
    }
  }

  if (node.type === "VariableDeclaration") {
    for (const dec of node.declarations) {
      if (dec.type === "VariableDeclarator") {
        const init = dec.init
        if (init && init.type === "CallExpression") {
          const { callee } = init
          if (
            callee.type === "Identifier" &&
            callee.name === state.importName
          ) {
            if (init.arguments.length === 1) {
              state.didAddArg = !!init.arguments.push({
                type: "Literal",
                value: id,
              })
            }
          }
        }
      }
    }
  }

  if (node.type === "ExportDefaultDeclaration") {
    if (
      node.declaration.type === "CallExpression" &&
      node.declaration.callee.type === "Identifier" &&
      node.declaration.callee.name === state.importName
    ) {
      if (node.declaration.arguments.length === 1) {
        state.didAddArg = !!node.declaration.arguments.push({
          type: "Literal",
          value: id,
        })
        return
      }
    }
  }

  for (const n of Object.keys(node) as (keyof typeof node)[]) {
    const nk = node[n]
    if (!!nk && typeof nk === "object") {
      traverse(nk as any as EsNode, id, state)
    }
  }
}

function createHash(str: string) {
  var hash = 0,
    i,
    chr
  if (str.length === 0) return hash
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

export function gen(
  code: string,
  path: string
): {
  id: string
  code: string
} {
  const id = createHash(path + code).toString(36)
  const ast = esprima.parseModule(code)
  const state = { importName: "", didAddArg: false }

  traverse(ast, id, state)

  if (!state.didAddArg) {
    throw new Error(`could not find async-worker-ts import in ${path}`)
  }

  return {
    id,
    code: escodegen.generate(ast),
  }
}
