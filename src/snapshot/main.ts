import tm from 'vscode-textmate'
import type { TokenizedLine } from './types.ts'

export async function getVSCodeTokens(
	registry: tm.Registry,
	scope: string,
	source: string,
): Promise<TokenizedLine[]> {
	const grammar = await registry.loadGrammar(scope)
	if (!grammar) {
		// biome-ignore lint: refactor still TODO
		throw new Error(`Could not load scope ${scope}`)
	}

	let ruleStack = tm.INITIAL

	const tokenizedLines = source.split(/\n|\r\n/).map((line: string) => {
		const { tokens, ruleStack: nextRuleStack } = grammar.tokenizeLine(line, ruleStack)
		ruleStack = nextRuleStack

		// Clear whitespace and and filter empty scopes.
		// We create new token objects to avoid mutating the read-only tokens from vscode-textmate.
		const processedTokens = tokens.map((token) => ({
			...token,
			scopes: token.scopes.map((s) => s.replaceAll(/\s+/g, '')).filter((s) => s.length > 0),
		}))

		return <TokenizedLine>{
			line: line,
			tokens: processedTokens,
		}
	})

	return tokenizedLines
}
