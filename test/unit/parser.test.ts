import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import { parseHeader, parseTestFile } from 'textmate-grammar-test/unit'
import type { GrammarTestFile } from '../../src/unit/model'

describe('parseHeader', () => {
	it('one char comment token', () => {
		const res = parseHeader('# SYNTAX TEST "scala"')
		expect(res).toEqual({
			commentToken: '#',
			scope: 'scala',
			description: '',
		})
	})

	it('description and longer comment token', () => {
		const res = parseHeader('-- SYNTAX TEST "sql" "some description"')
		expect(res).toEqual({
			commentToken: '--',
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
		expect(res.metadata.commentToken).toBe('#')
		expect(res.metadata.description.length).toBeGreaterThan(5)

		// Source lines with assertions
		expect(res.assertions).toHaveLength(4)

		// Number of assertions on last source line
		expect(res.assertions.at(-1)?.scopeAssertions).toHaveLength(3)
	}
})
