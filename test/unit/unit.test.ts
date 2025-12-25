import { describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import { createRegistry } from '../../src/common/index.ts'
import { unwrap } from '../../src/lib/result.ts'
import { ScopeRegexMode, TestRunner } from '../../src/unit/index.ts'
import type { TestFailure } from '../../src/unit/types.ts'

const registry = createRegistry([
	{
		scopeName: 'source.dhall',
		path: './test/resources/dhall.tmLanguage.json',
	},
])

const runner = new TestRunner(registry)

function read_file(filename: string): string {
	return fs.readFileSync(filename, 'utf-8')
}

describe('Grammar test case', () => {
	test('should report no errors on correct grammar test', async () => {
		const res = unwrap(
			await runner.test_file(
				read_file('./test/resources/successful.test.dhall'),
				ScopeRegexMode.standard,
			),
		)
		expect(res).toHaveLength(0)
	})

	test('should report missing scopes', async () => {
		const res = unwrap(
			await runner.test_file(
				read_file('./test/resources/missing.scopes.test.dhall'),
				ScopeRegexMode.standard,
			),
		)
		expect(res).toEqual([
			{
				missing: ['m1', 'keyword.operator.record.begin.dhall', 'm2.foo'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'keyword.operator.record.begin.dhall',
				],
				unexpected: [],
				line: 11,
				srcLineText: 'in  { home       = "/home/${user}"',
				start: 4,
				end: 5,
			},
			{
				missing: ['m3.foo', 'variable.object.property.dhall'],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'variable.object.property.dhall',
				],
				unexpected: [],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 6,
				end: 16,
			},
			{
				missing: ['m4.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m5.foo'],
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
				missing: ['m6.foo'],
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

	test('should report unexpected scopes', async () => {
		const res = unwrap(
			await runner.test_file(
				read_file('./test/resources/unexpected.scopes.test.dhall'),
				ScopeRegexMode.standard,
			),
		)
		expect(res).toEqual([
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'keyword.operator.record.begin.dhall',
				],
				unexpected: ['source.dhall'],
				line: 11,
				srcLineText: 'in  { home       = "/home/${user}"',
				start: 4,
				end: 5,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'variable.object.property.dhall',
				],
				unexpected: ['variable.object.property.dhall', 'source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 6,
				end: 16,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 19,
				end: 20,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 20,
				end: 26,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'punctuation.section.curly.begin.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 26,
				end: 28,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'meta.label.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 28,
				end: 32,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'punctuation.section.curly.end.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 32,
				end: 33,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 33,
				end: 44,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
				],
				unexpected: ['source.dhall'],
				line: 13,
				srcLineText: '    , privateKey = "/home/${user}/id_ed25519"',
				start: 44,
				end: 45,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'meta.declaration.data.record.literal.dhall',
					'string.quoted.double.dhall',
					'constant.other.placeholder.dhall',
					'meta.label.dhall',
				],
				unexpected: ['meta.label.dhall'],
				line: 17,
				srcLineText: '    , publicKey  = "/home/${user}/id_ed25519.pub"',
				start: 28,
				end: 32,
			},
			{
				missing: [],
				actual: [
					'source.dhall',
					'meta.declaration.data.record.block.dhall',
					'keyword.operator.record.end.dhall',
				],
				unexpected: [
					'meta.declaration.data.record.block.dhall',
					'keyword.operator.record.end.dhall',
				],
				line: 20,
				srcLineText: '}',
				start: 0,
				end: 1,
			},
		] as TestFailure[])
	})

	test('should report out of place scopes', async () => {
		const res = unwrap(
			await runner.test_file(
				read_file('./test/resources/misplaced.scopes.test.dhall'),
				ScopeRegexMode.standard,
			),
		)
		expect(res).toEqual([
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

	test('should report error when line assertion referes to non existing token', async () => {
		const res = unwrap(
			await runner.test_file(
				read_file('./test/resources/out.of.bounds.test.dhall'),
				ScopeRegexMode.standard,
			),
		)
		expect(res).toEqual([
			{
				end: 32,
				line: 5,
				actual: [],
				missing: ['missing.scope'],
				srcLineText: '',
				start: 30,
				unexpected: [],
			},
		])
	})
})
