import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Grammar } from './types.ts'

function createLangScopeMap(grammars: Grammar[]): Map<string, string> {
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

export function read_package_json(
	packageJsonPath: string,
	default_scope: string | undefined,
	extra_grammar_paths: string[],
): {
	grammars: Grammar[]
	extensionToScope: (ext: string) => string | undefined
} {
	const grammars: Grammar[] = []

	// Add extra grammars provided via CLI options
	if (extra_grammar_paths.length > 0) {
		const extra_grammars = extra_grammar_paths.map((path) => {
			return {
				path,
				scopeName: '',
			}
		})
		grammars.push(...extra_grammars)
	}

	if (!fs.existsSync(packageJsonPath)) {
		return {
			grammars,
			extensionToScope: () => default_scope || undefined,
		}
	}

	// Read and parse package.json
	const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
	const contrib_grammars: Grammar[] = json.contributes?.grammars ?? []
	const contrib_langs = json.contributes?.languages ?? []
	const root_dir = path.dirname(packageJsonPath)

	contrib_grammars.forEach((gr) => {
		gr.path = path.join(root_dir, gr.path)
	})
	grammars.push(...contrib_grammars)

	// TODO consider directly creating extToScope Map
	const langToScope = createLangScopeMap(grammars)
	const extToLang = createExtToLangMap(contrib_langs)
	const extensionToScope = (ext: string) =>
		default_scope ?? langToScope.get(extToLang.get(ext) ?? '')

	return { grammars, extensionToScope }
}
