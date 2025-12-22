import { describe, expect, it } from 'bun:test'
import { EOL } from 'node:os'
import { parseScopeAssertion } from '../../../src/unit/parser.ts'

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
