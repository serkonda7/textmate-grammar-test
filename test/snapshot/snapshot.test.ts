import { describe, expect, test } from 'bun:test'
import { getVSCodeTokens, renderSnapshot } from '../../src/snapshot/index.ts'
import { REGISTRY, read_data } from '../testutil.ts'

const SCOPE = 'source.xy'

describe('test snapshot testing', () => {
	test('report OK', async () => {
		const src = read_data('snap/snap.testlang')

		const tokens = await getVSCodeTokens(REGISTRY, SCOPE, src)
		const res = renderSnapshot(tokens, SCOPE)

		const expected = read_data('snap/snap.testlang.snap')
		expect(res).toEqual(expected)
	})
})
