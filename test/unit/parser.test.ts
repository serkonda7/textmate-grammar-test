import { describe, expect, test } from 'bun:test'
import { AssertionParser, parse_file, parseHeader } from '../../src/unit/index.ts'
import type { GrammarTestFile } from '../../src/unit/types.ts'
import { read_data } from '../testutil.ts'

describe('parseHeader', () => {
	test('one char comment token', () => {
		const res = parseHeader('# SYNTAX TEST v1 "scala"')
		expect(res.unwrap()).toEqual({
			comment_token: '#',
			scope: 'scala',
			description: '',
		})
	})

	test('parse versioned header', () => {
		const res = parseHeader('# SYNTAX TEST v3 "scala"')
		expect(res.unwrap()).toEqual({
			comment_token: '#',
			scope: 'scala',
			description: '',
		})
	})

	test('description and longer comment token', () => {
		const res = parseHeader('-- SYNTAX TEST v1 "sql" "some description"')
		expect(res.unwrap()).toEqual({
			comment_token: '--',
			description: 'some description',
			scope: 'sql',
		})
	})

	test('header errors', () => {
		const res = parseHeader('SYNTAX TEST v1 "scala"')
		expect(res.isErr() ? res.error : null).toBeInstanceOf(SyntaxError)
	})
})

describe('parseTestFile', () => {
	const input = read_data('parser.testlang')

	test('valid test file', () => {
		const res = parse_file(input).unwrap()
		check_result(res)
	})

	test('windows line endings', () => {
		const ctrl_input = input.replace(/\r?\n/g, '\n')
		const res = parse_file(ctrl_input).unwrap()
		check_result(res)
	})

	test('multiple assertions in one line', () => {
		const res = parse_file('# SYNTAX TEST v1 "source.xy"\nfoo bar\n# ^^  ^^^ source.xy\n').unwrap()
		expect(res.test_lines).toHaveLength(1)
		expect(res.test_lines[0]?.scope_asserts).toStrictEqual([
			{
				from: 2,
				to: 4,
				scopes: ['source.xy'],
				excludes: [],
			},
			{
				from: 6,
				to: 9,
				scopes: ['source.xy'],
				excludes: [],
			},
		])
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
		expect(assert_parser.parse_line('#^ source.xy').unwrap()).toStrictEqual({
			from: 1,
			to: 2,
			scopes: ['source.xy'],
			excludes: [],
		})

		const res2 = assert_parser.parse_line('# ^ source.xy').unwrap()
		expect(res2.from).toBe(2)
		expect(res2.to).toBe(3)
	})

	test('multiple ^^^', () => {
		const res = assert_parser.parse_line('# ^^^ string.xy').unwrap()
		expect(res.from).toBe(2)
		expect(res.to).toBe(5)
	})

	test('simple arrow <---', () => {
		const res = assert_parser.parse_line('# <--- source.xy').unwrap()
		expect(res.from).toBe(0)
		expect(res.to).toBe(3)
	})

	test('padded arrow <~~~--', () => {
		const res = assert_parser.parse_line('# <~~~-- source.xy').unwrap()
		expect(res.from).toBe(3)
		expect(res.to).toBe(5)
	})

	test('spaces before assert', () => {
		const res = assert_parser.parse_line('#    ^ source.xy').unwrap()
		expect(res.from).toBe(5)
	})

	test('leading spaces before comment', () => {
		const res = assert_parser.parse_line('    # ^^^ source.xy').unwrap()
		expect(res.scopes).toEqual(['source.xy'])
		expect(res.from).toBe(6)
		expect(res.to).toBe(9)
	})
})

describe('AssertionParser multiple assertions in one line', () => {
	const assert_parser = new AssertionParser(1)

	test('reuses the same scopes for repeated caret groups', () => {
		expect(assert_parser.parse_line_assertions('# ^^  ^^^ source.xy').unwrap()).toStrictEqual([
			{
				from: 2,
				to: 4,
				scopes: ['source.xy'],
				excludes: [],
			},
			{
				from: 6,
				to: 9,
				scopes: ['source.xy'],
				excludes: [],
			},
		])
	})

	test('reuses exclusions for repeated caret groups', () => {
		expect(
			assert_parser.parse_line_assertions('# ^^  ^^^ source.xy ! foo.bar').unwrap(),
		).toStrictEqual([
			{
				from: 2,
				to: 4,
				scopes: ['source.xy'],
				excludes: ['foo.bar'],
			},
			{
				from: 6,
				to: 9,
				scopes: ['source.xy'],
				excludes: ['foo.bar'],
			},
		])
	})

	test('reuses negative-only assertions for repeated caret groups', () => {
		expect(assert_parser.parse_line_assertions('# ^^^ ^^ ! source.xy').unwrap()).toStrictEqual([
			{
				from: 2,
				to: 5,
				scopes: [],
				excludes: ['source.xy'],
			},
			{
				from: 6,
				to: 8,
				scopes: [],
				excludes: ['source.xy'],
			},
		])
	})
})

describe('AssertionParser scopes', () => {
	const assert_parser = new AssertionParser(1)

	test('multiple scopes', () => {
		const res = assert_parser.parse_line('# ^ constant.int.xy').unwrap()
		expect(res.scopes).toHaveLength(1)
		expect(res.excludes).toHaveLength(0)
	})

	test('c++ scope', () => {
		const res = assert_parser.parse_line('# ^ source.c++').unwrap()
		expect(res.scopes).toEqual(['source.c++'])
	})

	test('Scope name with symbols', () => {
		const res = assert_parser.parse_line('# ^ foo.$0.--.spam#25').unwrap()
		expect(res.scopes).toEqual(['foo.$0.--.spam#25'])
	})

	test('exclusions', () => {
		const res = assert_parser
			.parse_line('# <-- ! constant.int.xy comment.line.number-sign.xy')
			.unwrap()
		expect(res.excludes).toHaveLength(2)
		expect(res.scopes).toHaveLength(0)
	})

	test('caret exclusions', () => {
		const res = assert_parser.parse_line('# ^ ! source.xy').unwrap()
		expect(res.scopes).toEqual([])
		expect(res.excludes).toEqual(['source.xy'])
	})

	test('complex', () => {
		const res = assert_parser.parse_line('# <~~-- source.xy comment.line.xy ! foo.bar bar').unwrap()
		expect(res.scopes).toEqual(['source.xy', 'comment.line.xy'])
		expect(res.excludes).toEqual(['foo.bar', 'bar'])
	})

	test('trailing spaces', () => {
		const res = assert_parser.parse_line('# ^ source.xy   ').unwrap()
		expect(res.scopes).toEqual(['source.xy'])
	})

	test('Error on missing scopes', () => {
		const r1 = assert_parser.parse_line('# ^ ')
		expect(r1.isErr() ? r1.error : null).toBeInstanceOf(SyntaxError)

		const r2 = assert_parser.parse_line('# <-- ')
		expect(r2.isErr() ? r2.error : null).toBeInstanceOf(SyntaxError)
	})
})
