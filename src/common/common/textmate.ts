import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import oniguruma from 'vscode-oniguruma'
import tm from 'vscode-textmate'
import type { IGrammarConfig } from './types.ts'

// TODO refactor and consider rename
export function createRegistry(gs: IGrammarConfig[]): tm.Registry {
	return createRegistryFromGrammars(
		gs.map((grammar) => {
			return {
				grammar,
				content: fs.readFileSync(grammar.path).toString(),
			}
		}),
	)
}

// TODO consider rename to createTmRegistry
function createRegistryFromGrammars(grammars: Array<{ grammar: IGrammarConfig; content: string }>) {
	const grammar_map = new Map<string, tm.IRawGrammar>()
	const injection_map = new Map<string, string[]>()

	for (const { grammar, content } of grammars) {
		const raw = tm.parseRawGrammar(content, grammar.path)
		grammar_map.set(grammar.scopeName || raw.scopeName, raw)

		if (grammar.injectTo) {
			for (const inject_scope of grammar.injectTo) {
				let injections = injection_map.get(inject_scope)
				if (!injections) {
					injections = []
					injection_map.set(inject_scope, injections)
				}
				injections.push(grammar.scopeName)
			}
		}
	}

	// TODO refactor below part
	const wasmUrl = new URL(import.meta.resolve('vscode-oniguruma'))
	const wasmPath = fileURLToPath(wasmUrl).replace(/main\.js$/, 'onig.wasm')
	const wasmBin = fs.readFileSync(wasmPath).buffer
	const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
		return {
			createOnigScanner(patterns: string[]) {
				return new oniguruma.OnigScanner(patterns)
			},
			createOnigString(s: string) {
				return new oniguruma.OnigString(s)
			},
		}
	})

	return new tm.Registry({
		onigLib: vscodeOnigurumaLib,
		loadGrammar: (scopeName) => {
			if (grammar_map.get(scopeName) !== undefined) {
				return new Promise((fulfill) => {
					fulfill(grammar_map.get(scopeName))
				})
			}
			console.warn(`grammar not found for "${scopeName}"`)
			return null
		},
		getInjections: (scopeName) => {
			const xs = scopeName.split('.')
			let injections: string[] = []
			for (let i = 1; i <= xs.length; i++) {
				const subScopeName = xs.slice(0, i).join('.')
				injections = [...injections, ...(injection_map.get(subScopeName) || [])]
			}
			return injections
		},
	} as tm.RegistryOptions)
}
