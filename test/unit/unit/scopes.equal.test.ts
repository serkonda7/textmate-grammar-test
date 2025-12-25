import { describe, expect, it } from 'bun:test'

import { missingScopes_ } from '../../../src/unit/test_runner.ts'

// FIXME: move somewhere..
describe('scopesEqual_', () => {
	it('should return [] on two empty arrays', () => {
		expect(missingScopes_([], [])).toEqual([])
	})
	it('should return [] on empty requirements array', () => {
		expect(missingScopes_([], ['a', 'b', 'c'])).toEqual([])
	})
	it('should return [] when requirements is a subset of a source array', () => {
		expect(missingScopes_(['b', 'd', 'e'], ['a', 'b', 'c', 'd', 'e', 'f'])).toEqual([])
	})
	it('should work with duplicate elements', () => {
		expect(missingScopes_(['a', 'b', 'd', 'e'], ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f'])).toEqual(
			[],
		)
	})
	it('should work with duplicate elements in requirements', () => {
		expect(
			missingScopes_(['a', 'a', 'a', 'b', 'd', 'e'], ['a', 'a', 'a', 'b', 'c', 'd', 'e', 'f']),
		).toEqual([])
	})
	it('should return [] when elements a bit misaligned', () => {
		expect(missingScopes_(['b', 'c', 'a'], ['a', 'a', 'b', 'c', 'd', 'a', 'a', 'f'])).toEqual([])
	})
	it('should return missing when actual array is empty', () => {
		expect(missingScopes_(['b', 'c', 'a'], [])).toEqual(['b', 'c', 'a'])
	})
	it('should return missing when the arrays are different', () => {
		expect(missingScopes_(['b', 'e', 'a'], ['b', 'c', 'a'])).toEqual(['e', 'a'])
	})
	it('should return missing when expected contains extra duplicate', () => {
		expect(missingScopes_(['b', 'c', 'a', 'a'], ['b', 'c', 'a'])).toEqual(['a'])
	})
})
