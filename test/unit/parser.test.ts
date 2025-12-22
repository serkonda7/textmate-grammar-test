import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import { parseHeader, parseTestFile } from '../../src/unit/index.ts'
import type { GrammarTestFile } from '../../src/unit/types.ts'

describe('parseHeader', () => {
	it('one char comment token', () => {
		const res = parseHeader('# SYNTAX TEST "scala"')
		expect(res).toEqual({
			comment_token: '#',
			scope: 'scala',
			description: '',
		})
	})

	it('description and longer comment token', () => {
		const res = parseHeader('-- SYNTAX TEST "sql" "some description"')
		expect(res).toEqual({
			comment_token: '--',
			description: 'some description',
			scope: 'sql',
		})
	})

	it('header errors', () => {
		expect(() => {
			parseHeader('# bla bla "scala"')
		}).toThrowError(SyntaxError('Invalid header'))
	})
})

describe('parseTestFile', () => {
	const input = fs.readFileSync('./test/resources/parser.testlang', 'utf-8')

	it('valid test file', () => {
		const res = parseTestFile(input)
		check_result(res)
	})

	it('windows line endings', () => {
		const ctrl_input = input.replace(/\r?\n/g, '\n')
		const res = parseTestFile(ctrl_input)
		check_result(res)
	})

	function check_result(res: GrammarTestFile) {
		expect(res.metadata.scope).toBe('source.testlang')
		expect(res.metadata.comment_token).toBe('#')
		expect(res.metadata.description.length).toBeGreaterThan(5)

		// Source lines with assertions
		expect(res.test_lines).toHaveLength(4)

		// Number of assertions on last source line
		expect(res.test_lines.at(-1)?.scope_asserts).toHaveLength(3)
	}
})
