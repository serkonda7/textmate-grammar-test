import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import { EOL } from 'node:os'
import { parseTestFile, parseScopeAssertion } from '../../../src/unit/parser.ts'
import { GrammarTestFile } from '../../../src/unit/model.ts'

describe('parseScopeAssertion', () => {
	it('should parse single ^ accent', () => {
		expect(parseScopeAssertion(0, 1, '#^ source.dhall')).toEqual([
			{
				from: 1,
				scopes: ['source.dhall'],
				exclude: [],
				to: 2,
			},
		])
	})
	it('should parse multiple ^^^^ accents', () => {
		expect(parseScopeAssertion(0, 1, '#  ^^^^^^ source.dhall')).toEqual([
			{
				from: 3,
				scopes: ['source.dhall'],
				exclude: [],
				to: 9,
			},
		])
	})

	it('should parse multiple scopes', () => {
		expect(parseScopeAssertion(0, 1, '# ^^ source.dhall variable.other.dhall')).toEqual([
			{
				from: 2,
				scopes: ['source.dhall', 'variable.other.dhall'],
				exclude: [],
				to: 4,
			},
		])
	})

	it('should parse multiple accent groups', () => {
		expect(parseScopeAssertion(0, 1, '# ^^ ^^^ source.dhall')).toStrictEqual([
			{
				exclude: [],
				from: 2,
				scopes: ['source.dhall'],
				to: 4,
			},
			{
				exclude: [],
				from: 5,
				scopes: ['source.dhall'],
				to: 8,
			},
		])
	})

	it('should parse single <- left arrow', () => {
		expect(parseScopeAssertion(0, 1, '# <- source.dhall')).toEqual([
			{
				from: 0,
				scopes: ['source.dhall'],
				exclude: [],
				to: 1,
			},
		])
	})

	it('should parse multi <~~--- left arrow with padding', () => {
		expect(parseScopeAssertion(0, 1, '# <~~~--- source.dhall')).toEqual([
			{
				from: 3,
				scopes: ['source.dhall'],
				exclude: [],
				to: 6,
			},
		])
	})
	it('should parse single ^ accent with exclusion', () => {
		expect(parseScopeAssertion(0, 1, '#^ - source.dhall')).toEqual([
			{
				from: 1,
				scopes: [],
				exclude: ['source.dhall'],
				to: 2,
			},
		])
	})
	it('should parse  ^^^ accents with scopes and exclusion', () => {
		expect(parseScopeAssertion(0, 1, '#^^^ foo.bar bar - source.dhall foo')).toEqual([
			{
				from: 1,
				scopes: ['foo.bar', 'bar'],
				exclude: ['source.dhall', 'foo'],
				to: 4,
			},
		])
	})
	it('should parse <- with exclusion', () => {
		expect(parseScopeAssertion(0, 1, '#<- - source.dhall')).toEqual([
			{
				from: 0,
				scopes: [],
				exclude: ['source.dhall'],
				to: 1,
			},
		])
	})
	it('should parse  <- with scopes and exclusion', () => {
		expect(parseScopeAssertion(0, 1, '#<-- foo.bar bar - source.dhall foo')).toEqual([
			{
				from: 0,
				scopes: ['foo.bar', 'bar'],
				exclude: ['source.dhall', 'foo'],
				to: 2,
			},
		])
	})
	it('should parse correctly treat spaces at the end with ^^', () => {
		expect(parseScopeAssertion(0, 1, '#^^ foo - bar   ')).toEqual([
			{
				from: 1,
				scopes: ['foo'],
				exclude: ['bar'],
				to: 3,
			},
		])
	})
	it('should parse correctly treat spaces at the end with  <- ', () => {
		expect(parseScopeAssertion(0, 1, '#<-- foo ')).toEqual([
			{
				from: 0,
				scopes: ['foo'],
				exclude: [],
				to: 2,
			},
		])
	})
	it('should throw an error for an empty <- ', () => {
		expect(() => parseScopeAssertion(0, 1, '#<-- - ')).toThrow(
			`Invalid assertion at line 0:${EOL}` +
				`#<-- - ${EOL}` +
				` Missing both required and prohibited scopes`,
		)
	})
	it('should throw an error on empty ^ ', () => {
		expect(() => parseScopeAssertion(0, 1, '# ^^^ ')).toThrow(
			`Invalid assertion at line 0:${EOL}` +
				`# ^^^ ${EOL}` +
				` Missing both required and prohibited scopes`,
		)
	})
})

describe('parseTestFile', () => {
	it('should parse a valid test case', () => {
		const testFile = fs.readFileSync('./test/resources/parser.test.dhall').toString()
		expect(parseTestFile(testFile)).toEqual(parserTestDhallExpectedResult)
	})

	it('should parse a test case with a windows line endings', () => {
		const originalFile = fs.readFileSync('./test/resources/parser.test.dhall').toString()
		const crlfFile = originalFile.replace(/\r?\n/g, '\n')
		expect(parseTestFile(crlfFile)).toEqual(parserTestDhallExpectedResult)
	})
})

const parserTestDhallExpectedResult: GrammarTestFile = {
	metadata: {
		commentToken: '--',
		description: '',
		scope: 'source.dhall',
	},
	assertions: [
		{
			line_number: 11,
			source_line: 'in  { home       = "/home/${user}"',
			scopeAssertions: [
				{
					from: 4,
					to: 5,
					scopes: ['keyword.operator.record.begin.dhall'],
					exclude: [],
				},
			],
		},
		{
			line_number: 13,
			source_line: '    , privateKey = "/home/${user}/id_ed25519"',
			scopeAssertions: [
				{
					from: 6,
					to: 16,
					scopes: [
						'source.dhall',
						'meta.declaration.data.record.block.dhall',
						'variable.object.property.dhall',
					],
					exclude: [],
				},
				{
					from: 17,
					to: 18,
					scopes: [
						'source.dhall',
						'meta.declaration.data.record.block.dhall',
						'meta.declaration.data.record.literal.dhall',
						'punctuation.separator.dictionary.key-value.dhall',
					],
					exclude: [],
				},
				{
					from: 19,
					to: 45,
					scopes: ['source.dhall', 'string.quoted.double.dhall'],
					exclude: [],
				},
			],
		},
		{
			line_number: 17,
			source_line: '    , publicKey  = "/home/${user}/id_ed25519.pub"',
			scopeAssertions: [
				{
					from: 26,
					to: 33,
					scopes: ['constant.other.placeholder.dhall'],
					exclude: [],
				},
				{
					from: 28,
					to: 32,
					scopes: ['meta.label.dhall'],
					exclude: [],
				},
			],
		},
		{
			line_number: 20,
			source_line: '}',
			scopeAssertions: [
				{
					from: 0,
					to: 1,
					scopes: ['keyword.operator.record.end.dhall'],
					exclude: [],
				},
			],
		},
	],
}
