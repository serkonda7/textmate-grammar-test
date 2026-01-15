import { describe, expect, test } from 'bun:test'
import { createRegistry } from '../../src/common/textmate/index.ts'
import { getVSCodeTokens, renderSnapshot } from '../../src/snapshot/index.ts'
import { read_testdata } from '../testutil.ts'

const grammars = [
	{
		scopeName: 'source.xy',
		path: './test/resources/testlang.tmLanguage.json',
	},
]
const SCOPE = 'source.xy'
const registry = createRegistry(grammars)

describe('test snapshot testing', () => {
	test('report OK', async () => {
		const src = read_testdata('snap/snap.testlang')

		const tokens = await getVSCodeTokens(registry, SCOPE, src)
		const res = renderSnapshot(tokens, SCOPE)

		const expected = read_testdata('snap/snap.testlang.snap')
		expect(res).toEqual(expected)
	})

	// TODO add test for header (syntax test)
})
