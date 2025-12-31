import { describe, expect, test } from 'bun:test'
import { find_overlapping_tokens } from '../../src/unit/index.ts'

describe('token overlap', async () => {
	/*
    var
#  ^^ source.xy
*/
	test('assert before token', () => {
		const tokens = [
			{ startIndex: 0, endIndex: 4, scopes: [] },
			{ startIndex: 4, endIndex: 7, scopes: [] },
		]
		const res = find_overlapping_tokens(tokens, 3, 5)
		expect(res).toEqual(tokens)
	})

	/*
  "foo"
#  ^^^ string.xy
*/
	test('token larger than assert', () => {
		// Note: textmate parses this as three tokens ("foo" -> ", foo, ")
		const tok = [{ startIndex: 2, endIndex: 7, scopes: [] }]
		const res = find_overlapping_tokens(tok, 3, 6)
		expect(res).toEqual(tok)
	})

	/*
  var
# ^^^ keyword.control.xy
*/
	test('assert exact token length', () => {
		const tok = [{ startIndex: 2, endIndex: 5, scopes: [] }]
		const res = find_overlapping_tokens(tok, 2, 5)
		expect(res).toEqual(tok)
	})

	/*
var
# ^^ keyword.control.xy
*/
	test('assert over last tok', () => {
		const tok = [{ startIndex: 0, endIndex: 3, scopes: [] }]
		const res = find_overlapping_tokens(tok, 2, 4)
		expect(res).toEqual(tok)
	})

	/*
"ab"
#   ^ ! source.xy
*/
	test('assert after line end', () => {
		const tok = [{ startIndex: 0, endIndex: 4, scopes: [] }]
		const res = find_overlapping_tokens(tok, 4, 5)
		expect(res).toEqual([])
	})
})
