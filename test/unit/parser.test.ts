import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import { unwrap } from '../../src/lib/result.ts'
import { AssertionParser, parse_file, parseHeader, ScopeRegexMode } from '../../src/unit/index.ts'
import type { GrammarTestFile } from '../../src/unit/types.ts'

describe('parseHeader', () => {
	test('one char comment token', () => {
		const res = parseHeader('# SYNTAX TEST "scala"')
		expect(res.value).toEqual({
			comment_token: '#',
			scope: 'scala',
			description: '',
		})
	})

	test('description and longer comment token', () => {
		const res = parseHeader('-- SYNTAX TEST "sql" "some description"')
		expect(res.value).toEqual({
			comment_token: '--',
			description: 'some description',
			scope: 'sql',
		})
	})

	test('header errors', () => {
		const res = parseHeader('SYNTAX TEST "scala"')
		expect(res.error).toBeInstanceOf(SyntaxError)
	})
})

describe('parseTestFile', () => {
	const input = fs.readFileSync('./test/resources/parser.testlang', 'utf-8')

	test('valid test file', () => {
		const res = unwrap(parse_file(input))
		check_result(res)
	})

	test('windows line endings', () => {
		const ctrl_input = input.replace(/\r?\n/g, '\n')
		const res = unwrap(parse_file(ctrl_input))
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
	const assert_parser = new AssertionParser(1, ScopeRegexMode.standard)

	test('single ^', () => {
		expect(unwrap(assert_parser.parse_line('#^ source.xy'))).toStrictEqual({
			from: 1,
			to: 2,
			scopes: ['source.xy'],
			excludes: [],
		})

		const res2 = unwrap(assert_parser.parse_line('# ^ source.xy'))
		expect(res2.from).toBe(2)
		expect(res2.to).toBe(3)
	})

	test('multiple ^^^', () => {
		const res = unwrap(assert_parser.parse_line('# ^^^ string.xy'))
		expect(res.from).toBe(2)
		expect(res.to).toBe(5)
	})

	test('simple arrow <---', () => {
		const res = unwrap(assert_parser.parse_line('# <--- source.xy'))
		expect(res.from).toBe(0)
		expect(res.to).toBe(3)
	})

	test('padded arrow <~~~--', () => {
		const res = unwrap(assert_parser.parse_line('# <~~~-- source.xy'))
		expect(res.from).toBe(3)
		expect(res.to).toBe(5)
	})

	test('spaces before assert', () => {
		const res = unwrap(assert_parser.parse_line('#    ^ source.xy'))
		expect(res.from).toBe(5)
	})

	test('leading spaces before comment', () => {
		const res = unwrap(assert_parser.parse_line('    # ^^^ source.xy'))
		expect(res.scopes).toEqual(['source.xy'])
		expect(res.from).toBe(6)
		expect(res.to).toBe(9)
	})
})

describe('AssertionParser scopes', () => {
	const assert_parser = new AssertionParser(1, ScopeRegexMode.standard)

	test('multiple scopes', () => {
		const res = unwrap(assert_parser.parse_line('# ^ constant.int.xy'))
		expect(res.scopes).toHaveLength(1)
		expect(res.excludes).toHaveLength(0)
	})

	test('exclusions', () => {
		const res = unwrap(
			assert_parser.parse_line('# <-- ! constant.int.xy comment.line.number-sign.xy'),
		)
		expect(res.excludes).toHaveLength(2)
		expect(res.scopes).toHaveLength(0)
	})

	test('complex', () => {
		const res = unwrap(assert_parser.parse_line('# <~~-- source.xy comment.line.xy ! foo.bar bar'))
		expect(res.scopes).toEqual(['source.xy', 'comment.line.xy'])
		expect(res.excludes).toEqual(['foo.bar', 'bar'])
	})

	test('trailing spaces', () => {
		const res = unwrap(assert_parser.parse_line('# ^ source.xy   '))
		expect(res.scopes).toEqual(['source.xy'])
	})

	test('Error on missing scopes', () => {
		expect(assert_parser.parse_line('# ^ ').error).toBeInstanceOf(SyntaxError)

		expect(assert_parser.parse_line('# <-- ').error).toBeInstanceOf(SyntaxError)
	})
})

describe('AssertionParser in different modes', () => {
	const legacy_parser = new AssertionParser(1, ScopeRegexMode.legacy)

	test('c++ scope', () => {
		const res = unwrap(legacy_parser.parse_line('# ^ source.c++'))
		expect(res.scopes).toEqual(['source.c++'])
	})

	const permissive_parser = new AssertionParser(1, ScopeRegexMode.permissive)

	test('Scope name with symbols', () => {
		const res = unwrap(permissive_parser.parse_line('# ^ foo.$0.--.spam#25'))
		expect(res.scopes).toEqual(['foo.$0.--.spam#25'])
	})
})
