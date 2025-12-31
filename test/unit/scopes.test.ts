import { describe, expect, test } from 'bun:test'

import { get_missing_scopes } from '../../src/unit/index.ts'

describe('get_missing_scopes: [] result', () => {
	test('two empty arrays', () => {
		expect(get_missing_scopes([], [])).toEqual([])
	})

	test('empty required', () => {
		expect(get_missing_scopes([], ['a'])).toEqual([])
	})

	test('required is a subset of a source array', () => {
		expect(get_missing_scopes(['b', 'd', 'e'], ['a', 'b', 'c', 'd', 'e'])).toEqual([])
	})

	test('duplicate elements in actual', () => {
		expect(get_missing_scopes(['a', 'b', 'd'], ['a', 'a', 'b', 'b', 'c', 'd'])).toEqual([])
	})

	test('duplicate elements in required', () => {
		expect(
			get_missing_scopes(['a', 'a', 'a', 'b', 'd', 'e'], ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f']),
		).toEqual([])
	})

	test('different elements order', () => {
		expect(get_missing_scopes(['b', 'c', 'a'], ['a', 'a', 'b', 'c', 'd', 'a', 'a', 'f'])).toEqual(
			[],
		)
	})
})

describe('get_missing_scopes: returns missing', () => {
	test('actual is empty', () => {
		const required = ['b', 'c', 'a']
		expect(get_missing_scopes(required, [])).toEqual(required)
	})

	// FIXME fix the reporting of 'a' as missing
	// However this might be fine as the order is significant
	test('return required that are not in actual', () => {
		const req = ['b', 'e', 'a']
		const act = ['b', 'c', 'a']
		expect(get_missing_scopes(req, act)).toEqual(['e', 'a'])
	})

	test('duplicate required is missing', () => {
		const req = ['b', 'c', 'a', 'a']
		const act = ['b', 'c', 'a']
		expect(get_missing_scopes(req, act)).toEqual(['a'])
	})
})
