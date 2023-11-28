import esprima from "esprima"
import escodegen from "escodegen"
import type {
  ExportDefaultDeclaration,
  ObjectExpression,
  Node as EsNode,
  Literal,
} from "estree"

// Function to check if a node matches the export default object pattern

type ExportDefaultObject = ExportDefaultDeclaration & {
  declaration: { arguments: [ObjectExpression, Literal | undefined] }
}

function traverse(node: EsNode): ExportDefaultObject | null {
  if (
    node.type === "ExportDefaultDeclaration" &&
    node.declaration.type === "CallExpression"
  ) {
    const { arguments: args } = node.declaration
    if (args.length === 1 && args[0].type === "ObjectExpression") {
      return node as ExportDefaultObject
    }
  }

  for (const n of Object.keys(node) as (keyof typeof node)[]) {
    const nk = node[n]
    if (nk && typeof nk === "object") {
      const _n = traverse(nk as any as EsNode)
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
  const defaultExportNode = traverse(ast)
  if (!defaultExportNode) {
    throw new Error("No default export found in " + path)
  }
  // generate a hash of the code to use as the worker id
  const id = createHash(path + code).toString(36)

  return {
    id,
    client: gen_client(id, ast, defaultExportNode),
  }
}

export function gen_client(
  id: string,
  ast: esprima.Program,
  defaultExportNode: ExportDefaultObject
) {
  // generate a unique name for the worker and pass it as the second argument to createWorkerClient

  defaultExportNode.declaration.arguments.push({
    type: "Literal",
    value: id,
  })

  return escodegen.generate(ast)
}
