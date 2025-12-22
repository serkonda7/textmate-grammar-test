import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import { AssertionParser, parseHeader, parseTestFile } from '../../src/unit/index.ts'
import type { GrammarTestFile } from '../../src/unit/types.ts'

describe('parseHeader', () => {
	test('one char comment token', () => {
		const res = parseHeader('# SYNTAX TEST "scala"')
		expect(res).toEqual({
			comment_token: '#',
			scope: 'scala',
			description: '',
		})
	})

	test('description and longer comment token', () => {
		const res = parseHeader('-- SYNTAX TEST "sql" "some description"')
		expect(res).toEqual({
			comment_token: '--',
			description: 'some description',
			scope: 'sql',
		})
	})

	test('header errors', () => {
		expect(() => {
			parseHeader('# bla bla "scala"')
		}).toThrowError(SyntaxError('Invalid header'))
	})
})

describe('parseTestFile', () => {
	const input = fs.readFileSync('./test/resources/parser.testlang', 'utf-8')

	test('valid test file', () => {
		const res = parseTestFile(input)
		check_result(res)
	})

	test('windows line endings', () => {
		const ctrl_input = input.replace(/\r?\n/g, '\n')
		const res = parseTestFile(ctrl_input)
		check_result(res)
	})

	function check_result(res: GrammarTestFile) {
		expect(res.metadata.scope).toBe('source.xy')
		expect(res.metadata.comment_token).toBe('#')
		expect(res.metadata.description.length).toBeGreaterThan(5)

		// Source lines with assertions
		expect(res.test_lines).toHaveLength(4)

		// Number of assertions on last source line
		expect(res.test_lines.at(-1)?.scope_asserts).toHaveLength(3)
	}
})

describe('AssertionParser assert kinds', () => {
	const assert_parser = new AssertionParser(1)

	test('single ^', () => {
		expect(assert_parser.parse_line('#^ source.xy')).toStrictEqual([
			{
				from: 1,
				to: 2,
				scopes: ['source.xy'],
				exclude: [],
			},
		])

		const res2 = assert_parser.parse_line('# ^ source.xy')[0]
		expect(res2.from).toBe(2)
		expect(res2.to).toBe(3)
	})

	test('multiple ^^^', () => {
		const res = assert_parser.parse_line('# ^^^ string.xy')[0]
		expect(res.from).toBe(2)
		expect(res.to).toBe(5)
	})

	/* TODO
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
	*/

	test('simple arrow <---', () => {
		const res = assert_parser.parse_line('# <--- source.xy')[0]
		expect(res.from).toBe(0)
		expect(res.to).toBe(3)
	})

	test('padded arrow <~~~--', () => {
		const res = assert_parser.parse_line('# <~~~-- source.xy')[0]
		expect(res.from).toBe(3)
		expect(res.to).toBe(5)
	})

	test('spaces before assert', () => {
		const res = assert_parser.parse_line('#    ^ source.xy')[0]
		expect(res.from).toBe(5)
	})

	test('leading spaces before comment', () => {
		const res = assert_parser.parse_line('    # ^^^ source.xy')[0]
		expect(res.scopes).toEqual(['source.xy'])
		expect(res.from).toBe(6)
		expect(res.to).toBe(9)
	})
})

describe('AssertionParser scopes', () => {
	const assert_parser = new AssertionParser(1)

	test('multiple scopes', () => {
		const res = assert_parser.parse_line('# ^ constant.int.xy')[0]
		expect(res.scopes).toHaveLength(1)
		expect(res.exclude).toHaveLength(0)
	})

	test('exclusions', () => {
		const res = assert_parser.parse_line('# <-- ! constant.int.xy comment.line.xy')[0]
		expect(res.exclude).toHaveLength(2)
		expect(res.scopes).toHaveLength(0)
	})

	test('complex', () => {
		const res = assert_parser.parse_line('# <~~-- source.xy comment.line.xy ! foo.bar bar')[0]
		expect(res.scopes).toEqual(['source.xy', 'comment.line.xy'])
		expect(res.exclude).toEqual(['foo.bar', 'bar'])
	})

	test('trailing spaces', () => {
		const res = assert_parser.parse_line('# ^ source.xy   ')[0]
		expect(res.scopes).toEqual(['source.xy'])
	})

	test('missing scopes', () => {
		expect(() => {
			assert_parser.parse_line('# ^ ')
		}).toThrowError()

		expect(() => {
			assert_parser.parse_line('# <-- ')
		}).toThrowError()
	})
})
