import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import oniguruma from 'vscode-oniguruma'
import tm from 'vscode-textmate'
import type { IGrammarConfig } from './model.ts'

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

export function createRegistryFromGrammars(
	grammars: Array<{ grammar: IGrammarConfig; content: string }>,
): tm.Registry {
	const grammarIndex: { [key: string]: tm.IRawGrammar } = {}

	const _injections: { [scopeName: string]: string[] } = {}

	for (const g of grammars) {
		const { grammar, content } = g
		const rawGrammar = tm.parseRawGrammar(content, grammar.path)

		grammarIndex[grammar.scopeName || rawGrammar.scopeName] = rawGrammar
		if (grammar.injectTo) {
			for (const injectScope of grammar.injectTo) {
				let injections = _injections[injectScope]
				if (!injections) {
					_injections[injectScope] = injections = []
				}
				injections.push(grammar.scopeName)
			}
		}
	}

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
			if (grammarIndex[scopeName] !== undefined) {
				return new Promise((fulfill) => {
					fulfill(grammarIndex[scopeName])
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
				injections = [...injections, ...(_injections[subScopeName] || [])]
			}
			return injections
		},
	} as tm.RegistryOptions)
}

export function loadConfiguration(
	configPath: string,
	scope: string | undefined,
	grammar: string[] | undefined,
): {
	grammars: IGrammarConfig[]
	extensionToScope: (ext: string) => string | undefined
} {
	const grammars: IGrammarConfig[] = []
	let extensionToScope: (ext: string) => string | undefined = () => scope || undefined

	if (grammar) {
		const xs = grammar.map((path: string) => ({ path, scopeName: '' }))
		grammars.push(...xs)
	}

	if (fs.existsSync(configPath)) {
		const json = JSON.parse(fs.readFileSync(configPath).toString())
		const xs: [IGrammarConfig] = json?.contributes?.grammars || []
		const dirPath = path.dirname(configPath)
		xs.forEach((x) => {
			x.path = path.join(dirPath, x.path)
		})
		grammars.push(...xs)

		const ys = json?.contributes?.languages || []

		const langToScope = Object.assign(
			{},
			...grammars.filter((x) => x.language).map((x) => ({ [x.language || '']: x.scopeName })),
		)
		const extToLang = Object.assign(
			{},
			...ys.flatMap((x: any) => (x.extensions || []).map((e: any) => ({ [e]: x.id }))),
		)
		extensionToScope = (ext) => scope || langToScope[extToLang[ext]]
	}
	return { grammars, extensionToScope }
}
