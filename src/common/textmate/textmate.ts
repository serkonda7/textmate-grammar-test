import fs from 'node:fs'
import path from 'node:path'
import { err, ok, type Result } from '@serkonda7/ts-result'
import tm from 'vscode-textmate'
import { createOnigurumaLib } from './oniguruma.ts'
import type { Grammar, Language } from './types.ts'

export function register_grammars(
	package_json_path: string,
	extra_grammar_paths: string[], // Optionally added via CLI
): Result<{
	registry: tm.Registry
	extToScope: (ext: string) => string
}> {
	const grammars: Grammar[] = grammars_from_paths(extra_grammar_paths)

	const json = JSON.parse(fs.readFileSync(package_json_path, 'utf-8'))
	const contrib_grammars: Grammar[] = json.contributes?.grammars ?? []
	const contrib_langs: Language[] = json.contributes?.languages ?? []

	// Set contributed grammar paths to absolute.
	// Reason: package.json could not be in cwd
	const root_dir = path.dirname(package_json_path)
	contrib_grammars.forEach((gr) => {
		gr.path = path.join(root_dir, gr.path)
	})

	grammars.push(...contrib_grammars)

	if (grammars.length === 0) {
		return err(new Error('No grammars provided'))
	}

	// TODO further optimization as extToScope is only used in snapshot tests

	// Map grammar languages to scopes
	const lang_to_scope = new Map<string, string>()
	for (const grammar of grammars) {
		lang_to_scope.set(grammar.language, grammar.scopeName)
	}

	// Map file extensions to scopes
	const extension_to_scope = new Map<string, string>()
	for (const lang of contrib_langs) {
		const scope = lang_to_scope.get(lang.id)

		if (!scope) {
			// TODO ? return error
			continue
		}

		for (const ext of lang.extensions) {
			extension_to_scope.set(ext, scope)
		}
	}

	const registry = createRegistry(grammars)

	return ok({
		registry,
		extToScope: (ext: string) => extension_to_scope.get(ext) || '',
	})
}

function grammars_from_paths(paths: string[]): Grammar[] {
	return paths.map((path) => ({
		path,
		scopeName: '',
		language: '',
	}))
}

export function createRegistry(gs: Grammar[]): tm.Registry {
	const onig_lib = createOnigurumaLib()

	const grammars = gs.map((grammar) => ({
		grammar,
		content: fs.readFileSync(grammar.path, 'utf-8'),
	}))

	return createRegistryFromGrammars(grammars, onig_lib)
}

function createRegistryFromGrammars(
	grammars: { grammar: Grammar; content: string }[],
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
