import { describe, expect, it } from 'bun:test'

import { get_missing_scopes } from '../../src/unit/index.ts'

// FIXME: move somewhere..
describe('scopesEqual_', () => {
	it('should return [] on two empty arrays', () => {
		expect(get_missing_scopes([], [])).toEqual([])
	})
	it('should return [] on empty requirements array', () => {
		expect(get_missing_scopes([], ['a', 'b', 'c'])).toEqual([])
	})
	it('should return [] when requirements is a subset of a source array', () => {
		expect(get_missing_scopes(['b', 'd', 'e'], ['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([])
	})
	it('should work with duplicate elements', () => {
		expect(
			get_missing_scopes(['a', 'b', 'd', 'e'], ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f']),
		).toEqual([])
	})
	it('should work with duplicate elements in requirements', () => {
		expect(
			get_missing_scopes(['a', 'a', 'a', 'b', 'd', 'e'], ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f']),
		).toEqual([])
	})
	it('should return [] when elements a bit misaligned', () => {
		expect(get_missing_scopes(['b', 'c', 'a'], ['a', 'a', 'b', 'c', 'd', 'a', 'a', 'f'])).toEqual(
			[],
		)
	})
	it('should return missing when actual array is empty', () => {
		expect(get_missing_scopes(['b', 'c', 'a'], [])).toEqual(['b', 'c', 'a'])
	})
	it('should return missing when the arrays are different', () => {
		expect(get_missing_scopes(['b', 'e', 'a'], ['b', 'c', 'a'])).toEqual(['e', 'a'])
	})
	it('should return missing when expected contains extra duplicate', () => {
		expect(get_missing_scopes(['b', 'c', 'a', 'a'], ['b', 'c', 'a'])).toEqual(['a'])
	})
})
