import fs from 'node:fs'
import tm from 'vscode-textmate'
import { createOnigurumaLib } from './oniguruma.ts'
import type { IGrammarConfig } from './types.ts'

// TODO refactor and consider rename
export function createRegistry(gs: IGrammarConfig[]): tm.Registry {
	const onig_lib = createOnigurumaLib()

	return createRegistryFromGrammars(
		gs.map((grammar) => {
			return {
				grammar,
				content: fs.readFileSync(grammar.path).toString(),
			}
		}),
		onig_lib,
	)
}

// TODO consider rename to createTmRegistry
function createRegistryFromGrammars(
	grammars: Array<{ grammar: IGrammarConfig; content: string }>,
	onig_lib: Promise<tm.IOnigLib>,
): tm.Registry {
	const grammar_map = new Map<string, tm.IRawGrammar>()
	const injection_map = new Map<string, string[]>()

	for (const { grammar, content } of grammars) {
		const raw = tm.parseRawGrammar(content, grammar.path)
		grammar_map.set(grammar.scopeName || raw.scopeName, raw)

		if (!grammar.injectTo) {
			continue
		}

		// Add injections
		for (const inject_scope of grammar.injectTo) {
			let injections = injection_map.get(inject_scope)
			if (!injections) {
				injections = []
				injection_map.set(inject_scope, injections)
			}
			injections.push(grammar.scopeName)
		}
	}

	return new tm.Registry({
		onigLib: onig_lib,

		async loadGrammar(scopeName) {
			const grammar = grammar_map.get(scopeName)
			if (!grammar) {
				console.warn(`grammar not found for "${scopeName}"`)
				return null
			}
			return grammar
		},

		getInjections: (scopeName) => {
			const parts = scopeName.split('.')
			const injections: string[] = []
			let cur_scope = ''

			for (const part of parts) {
				// Build current sub-scope
				cur_scope = cur_scope ? `${cur_scope}.${part}` : part

				// Add injections if any
				injections.push(...(injection_map.get(cur_scope) ?? []))
			}

			return injections
		},
	})
}
