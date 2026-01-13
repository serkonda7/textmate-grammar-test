import * as fs from 'node:fs'
import * as path from 'node:path'
import type { IGrammarConfig } from './types.ts'

function paths_to_grammars(paths: string[]) {
	return paths.map((path) => ({ path, scopeName: '' }))
}

function createLangScopeMap(grammars: IGrammarConfig[]): Map<string, string> {
	const map = new Map<string, string>()

	for (const grammar of grammars) {
		if (grammar.language && grammar.scopeName) {
			map.set(grammar.language, grammar.scopeName)
		}
	}

	return map
}

function createExtToLangMap(languages: any[]): Map<string, string> {
	const map = new Map<string, string>()

	for (const lang of languages) {
		for (const ext of lang.extensions) {
			map.set(ext, lang.id)
		}
	}

	return map
}

export function loadConfiguration(
	packageJsonPath: string,
	scope: string | undefined,
	extra_paths: string[],
): {
	grammars: IGrammarConfig[]
	extensionToScope: (ext: string) => string | undefined
} {
	const grammars: IGrammarConfig[] = []

	if (extra_paths.length > 0) {
		const extra_grammars = paths_to_grammars(extra_paths)
		grammars.push(...extra_grammars)
	}

	if (!fs.existsSync(packageJsonPath)) {
		return {
			grammars,
			extensionToScope: () => scope || undefined,
		}
	}

	const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
	const contrib_grammars: IGrammarConfig[] = json?.contributes?.grammars || []
	const contrib_langs = json?.contributes?.languages || []
	const root_dir = path.dirname(packageJsonPath)

	contrib_grammars.forEach((gr) => {
		gr.path = path.join(root_dir, gr.path)
	})
	grammars.push(...contrib_grammars)

	// TODO consider directly creating extToScope Map
	const langToScope = createLangScopeMap(grammars)
	const extToLang = createExtToLangMap(contrib_langs)
	const extensionToScope = (ext: string) => scope ?? langToScope.get(extToLang.get(ext) ?? '')

	return { grammars, extensionToScope }
}
