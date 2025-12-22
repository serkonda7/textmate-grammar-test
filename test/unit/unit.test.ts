import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import { createRegistry } from '../../src/common/index.ts'
import { runGrammarTestCase } from '../../src/unit/core.ts'
import { parseTestFile } from '../../src/unit/index.ts'
import type { TestFailure } from '../../src/unit/types.ts'

const registry = createRegistry([
	{
		scopeName: 'source.dhall',
		path: './test/resources/dhall.tmLanguage.json',
	},
])

function loadFile(filename: string): string {
	return fs.readFileSync(filename).toString()
}

describe('Grammar test case', () => {
	it('should report no errors on correct grammar test', () => {
		return runGrammarTestCase(
			registry,
			parseTestFile(loadFile('./test/resources/successful.test.dhall')),
		).then((result) => {
			expect(result).toEqual([])
		})
	})
	it('should report missing scopes', () => {
		return runGrammarTestCase(
			registry,
			parseTestFile(loadFile('./test/resources/missing.scopes.test.dhall')),
		).then((result) => {
			expect(result).toEqual([
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
	})
	it('should report unexpected scopes', () => {
		return runGrammarTestCase(
			registry,
			parseTestFile(loadFile('./test/resources/unexpected.scopes.test.dhall')),
		).then((result) => {
			expect(result).toEqual([
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
	})
	it('should report out of place scopes', () => {
		return runGrammarTestCase(
			registry,
			parseTestFile(loadFile('./test/resources/misplaced.scopes.test.dhall')),
		).then((result) => {
			expect(result).toEqual([
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
	it('should report error when line assertion referes to non existing token', () => {
		return runGrammarTestCase(
			registry,
			parseTestFile(loadFile('./test/resources/out.of.bounds.test.dhall')),
		).then((result) => {
			expect(result).toEqual([
				{
					end: 32,
					line: 6,
					actual: [],
					missing: ['missing.scope'],
					srcLineText: '',
					start: 30,
					unexpected: [],
				},
			])
		})
	})
})
