import * as fs from 'node:fs'
import * as path from 'node:path'
import type { IGrammarConfig } from './types.ts'

export function loadConfiguration(
	packageJsonPath: string,
	scope: string | undefined,
	extra_grammars: string[],
): {
	grammars: IGrammarConfig[]
	extensionToScope: (ext: string) => string | undefined
} {
	const grammars: IGrammarConfig[] = []
	let extensionToScope: (ext: string) => string | undefined = () => scope || undefined

	if (extra_grammars.length > 0) {
		const xs = extra_grammars.map((path: string) => ({ path, scopeName: '' }))
		grammars.push(...xs)
	}

	if (!fs.existsSync(packageJsonPath)) {
		return { grammars, extensionToScope }
	}

	const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
	const contrib_grammars: IGrammarConfig[] = json?.contributes?.grammars || []
	const contrib_langs = json?.contributes?.languages || []
	const root_dir = path.dirname(packageJsonPath)

	contrib_grammars.forEach((gr) => {
		gr.path = path.join(root_dir, gr.path)
	})
	grammars.push(...contrib_grammars)

	const langToScope = Object.assign(
		{},
		...grammars.filter((x) => x.language).map((x) => ({ [x.language || '']: x.scopeName })),
	)
	const extToLang = Object.assign(
		{},
		...contrib_langs.flatMap((x: any) => (x.extensions || []).map((e: any) => ({ [e]: x.id }))),
	)
	extensionToScope = (ext) => scope || langToScope[extToLang[ext]]

	return { grammars, extensionToScope }
}
