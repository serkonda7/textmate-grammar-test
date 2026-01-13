import tm from 'vscode-textmate'
import type { TokenizedLine } from './types.ts'

export async function getVSCodeTokens(
	registry: tm.Registry,
	scope: string,
	source: string,
): Promise<TokenizedLine[]> {
	return registry.loadGrammar(scope).then((grammar: tm.IGrammar | null) => {
		if (!grammar) {
			// biome-ignore lint: refactor still TODO
			throw new Error(`Could not load scope ${scope}`)
		}

		let ruleStack = tm.INITIAL

		return source.split(/\r\n|\n/).map((line: string) => {
			const { tokens, ruleStack: ruleStack1 } = grammar.tokenizeLine(line, ruleStack)
			ruleStack = ruleStack1

			return <TokenizedLine>{
				line: line,
				tokens: tokens,
			}
		})
	})
}
