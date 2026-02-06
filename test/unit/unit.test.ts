import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import { unwrap } from '@serkonda7/ts-result'
import { createRegistry } from '../../src/common/textmate/index.ts'
import { TestRunner } from '../../src/unit/index.ts'
import type { TestFailure } from '../../src/unit/types.ts'

const grammars = [
	{
		scopeName: 'source.dhall',
		language: 'dhall',
		path: './test/resources/dhall.tmLanguage.json',
	},
]

const registry = createRegistry(grammars)
const runner = new TestRunner(registry)

function read_file(filename: string): string {
	return fs.readFileSync(filename, 'utf-8')
}

describe('Grammar test case', () => {
	test('should report out of place scopes', async () => {
		const res = unwrap(
			await runner.test_file(read_file('./test/resources/misplaced.scopes.test.dhall')),
		)
		expect(res.failures).toEqual([
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'punctuation.separator.dictionary.key-value.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 17,
				end: 18,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 19,
				end: 20,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 20,
				end: 26,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'punctuation.section.curly.begin.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 26,
				end: 28,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'meta.label.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 28,
				end: 32,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'punctuation.section.curly.end.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 32,
				end: 33,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 33,
				end: 44,
			},
			{
				missing: ['source.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 44,
				end: 45,
			},
			{
				missing: ['meta.declaration.data.record.block.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'keyword.operator.record.end.dhall',
				],
				unexpected: [],
				line: 20,
				srcLineText: '}',
				start: 0,
				end: 1,
			},
		] as TestFailure[])
	})
})
