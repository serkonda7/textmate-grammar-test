import fs from 'node:fs'
import path from 'node:path'
import { createRegistry } from '../src/common/textmate/index.ts'

const root = path.resolve(process.cwd()).replace(/[/\\]+/g, '/') + '/'

const TESTLANG_GRAMMARS = [
	{
		scopeName: 'source.xy',
		language: 'testlang',
		path: './test/data/testlang.tmLanguage.json',
	},
]
export const REGISTRY = createRegistry(TESTLANG_GRAMMARS, false)

/**
 * Normalize various items in the unit tests, such as:
 *  - line endings
 *  - path separators
 *  - ascii symbols (checkmark, x, etc...).
 */
export function normalize(text: string): string {
	if (text === '') {
		return text
	}

	return (
		text
			// Path separators
			.replace(/[/\\]+/g, '/')

			// Trim absolute paths
			.replaceAll(root, '')

			// Line endings
			.replace(/\r?\n/g, '\n')

			// Symbols
			.replace(/\u221A/g, '✓')
			.replace(/\u00D7/g, '✖')

			// Trim whitespace
			.trim()
	)
}

export function read_data(file: string): string {
	return fs.readFileSync(`./test/data/${file}`, 'utf-8')
}
