import { describe, expect, test } from 'bun:test'
import { createRegistry } from '../../src/common/textmate/index.ts'
import { getVSCodeTokens, renderSnapshot } from '../../src/snapshot/index.ts'
import { read_data, TESTLANG_GRAMMARS } from '../testutil.ts'

const SCOPE = 'source.xy'
const registry = createRegistry(TESTLANG_GRAMMARS)

describe('test snapshot testing', () => {
	test('report OK', async () => {
		const src = read_data('snap/snap.testlang')

		const tokens = await getVSCodeTokens(registry, SCOPE, src)
		const res = renderSnapshot(tokens, SCOPE)

		const expected = read_data('snap/snap.testlang.snap')
		expect(res).toEqual(expected)
	})
})
