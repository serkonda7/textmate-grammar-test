import * as fs from 'node:fs'
import * as path from 'node:path'
import type { IGrammarConfig } from './types.ts'

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
