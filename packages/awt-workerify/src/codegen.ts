import esprima from "esprima"
import escodegen from "escodegen"
import type {
  Node as EsNode,
  SimpleCallExpression,
  VariableDeclaration,
} from "estree"

function traverse(
  node: EsNode,
  state = {
    importName: "",
    exportDefaultName: "",
    varDecs: [] as VariableDeclaration[],
    path: "",
  }
): SimpleCallExpression | null {
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
        const expr = dec.init
        if (expr && expr.type === "CallExpression") {
          const { callee } = expr
          if (
            callee.type === "Identifier" &&
            callee.name === state.importName
          ) {
            state.varDecs.push(node)
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
      return node.declaration
    }

    if (node.declaration.type === "Identifier") {
      const identifierName = node.declaration.name
      for (const v of state.varDecs) {
        const declarator = v.declarations.find(
          (d) =>
            d.id.type === "Identifier" &&
            d.id.name === identifierName &&
            d.init?.type === "CallExpression" &&
            d.init.callee.type === "Identifier" &&
            d.init.callee.name === state.importName
        )
        if (declarator && declarator.init) {
          return declarator.init as SimpleCallExpression
        }
      }
    }
  }

  for (const n of Object.keys(node) as (keyof typeof node)[]) {
    const nk = node[n]
    if (nk && typeof nk === "object") {
      const _n = traverse(nk as any as EsNode, state)
      if (_n) return _n
    }
  }
  return null
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
  client: string
} {
  const ast = esprima.parseModule(code)
  const clientCreationCall = traverse(ast)
  if (!clientCreationCall) {
    throw new Error("No valid default export found in " + path)
  }
  // generate a hash of the code to use as the worker id
  const id = createHash(path + code).toString(36)

  clientCreationCall.arguments.push({
    type: "Literal",
    value: id,
  })

  return {
    id,
    client: escodegen.generate(ast),
  }
}
