import * as tm from 'vscode-textmate'
import { AnnotatedLine } from './model.ts'
import { parseSnap, renderSnap } from './parsing.ts'

export { parseSnap, renderSnap }

export async function getVSCodeTokens(registry: tm.Registry, scope: string, source: string): Promise<AnnotatedLine[]> {
  return registry.loadGrammar(scope).then((grammar: tm.IGrammar | null) => {
    if (!grammar) {
      throw new Error(`Could not load scope ${scope}`)
    }

    let ruleStack = tm.INITIAL

    return source.split(/\r\n|\n/).map((line: string) => {
      const { tokens, ruleStack: ruleStack1 } = grammar.tokenizeLine(line, ruleStack)
      ruleStack = ruleStack1

      return <AnnotatedLine>{
        src: line,
        tokens: tokens
      }
    })
  })
}
