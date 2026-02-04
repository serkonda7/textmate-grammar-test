import fs from 'node:fs'
import path from 'node:path'
import { err, ok, type Result } from '@serkonda7/ts-result'
import { globSync } from 'glob'
import tm from 'vscode-textmate'
import { createOnigurumaLib } from './oniguruma.ts'
import type { ExtensionManifest, Grammar } from './types.ts'

// Map file extensions to scopes
const extension_to_scope = new Map<string, string>()

export function register_grammars(
	package_json_path: string,
	extra_grammar_paths: string[], // Optionally added via CLI
): Result<{
	registry: tm.Registry
	filenameToScope: (filename: string) => string
}> {
	const grammars: Grammar[] = []

	const json = JSON.parse(fs.readFileSync(package_json_path, 'utf-8')) as ExtensionManifest
	const contrib_grammars = json.contributes?.grammars
	const contrib_langs = json.contributes?.languages

	// Set contributed grammar paths to absolute.
	// Reason: package.json could not be in cwd
	if (Array.isArray(contrib_grammars)) {
		const root_dir = path.dirname(package_json_path)
		for (const contrib_grammar of contrib_grammars) {
			if (typeof contrib_grammar.path === 'string') {
				contrib_grammar.path = path.join(root_dir, contrib_grammar.path)
			} else {
				contrib_grammar.path = ''
			}
			if (typeof contrib_grammar.scopeName !== 'string') {
				contrib_grammar.scopeName = ''
			}
			if (typeof contrib_grammar.language !== 'string') {
				contrib_grammar.language = ''
			}
			grammars.push(contrib_grammar as Grammar)
		}
	}

	// Push explicitly added grammars so they can override package.json ones
	grammars.push(...grammars_from_paths(extra_grammar_paths))

	if (grammars.length === 0) {
		return err(new Error('no grammars found in package.json'))
	}

	// TODO: further optimization as filenameToScope is only used in snapshot tests

	// Map grammar languages to scopes
	const lang_to_scope = new Map<string, string>()
	for (const grammar of grammars) {
		lang_to_scope.set(grammar.language, grammar.scopeName)
	}

	// Map filenames to scopes
	const filename_to_scope = new Map<string, string>()
	if (Array.isArray(contrib_langs)) {
		for (const lang of contrib_langs) {
			if (typeof lang.id !== 'string') {
				continue
			}
			const scope = lang_to_scope.get(lang.id)

			if (!scope) {
				// TODO: return warning
				continue
			}

			if (Array.isArray(lang.extensions)) {
				for (const ext of lang.extensions) {
					extension_to_scope.set(ext.toLowerCase(), scope)
				}
			}

			if (Array.isArray(lang.filenames)) {
				for (const filename of lang.filenames) {
					filename_to_scope.set(filename.toLowerCase(), scope)
				}
			}
		}
	}

	const registry = createRegistry(grammars)

	return ok({
		registry,
		filenameToScope: (filename: string) =>
			filename_to_scope.get(filename.toLowerCase()) ||
			[...extension_to_scope].find((extensionScope) =>
				filename.toLowerCase().endsWith(extensionScope[0]),
			)?.[1] ||
			'',
	})
}

// Create Grammar objects from file paths or glob patterns
function grammars_from_paths(paths: string[]): Grammar[] {
	return paths
		.flatMap((path) => globSync(path))
		.map((path) => ({
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

		if (grammar.scopeName.length === 0) {
			grammar.scopeName = raw.scopeName
		}

		// Update extension-scope mapping
		if (raw.fileTypes) {
			for (const ext of raw.fileTypes) {
				extension_to_scope.set(ext.toLowerCase(), grammar.scopeName)
			}
		}

		grammar_map.set(grammar.scopeName, raw)

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
