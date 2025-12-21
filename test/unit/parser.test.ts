import { describe, expect, it } from 'bun:test'
import { parseHeader } from 'textmate-grammar-test/unit'

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
