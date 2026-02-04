import { expect, test } from 'bun:test'
import { unwrap } from '@serkonda7/ts-result'
import { register_grammars } from '../../src/common/textmate/textmate.ts'
import { getVSCodeTokens, renderSnapshot } from '../../src/snapshot/index.ts'
import { REGISTRY, read_data } from '../testutil.ts'

const SCOPE = 'source.xy'

test('report OK', async () => {
	const src = read_data('snap/snap.testlang')

	const tokens = await getVSCodeTokens(REGISTRY, SCOPE, src)
	const res = renderSnapshot(tokens, SCOPE)

	const expected = read_data('snap/snap.testlang.snap')
	expect(res).toEqual(expected)
})

test('multiple grammars for same file extension', async () => {
	json_grammars_test_helper(
		'test/data/json_jsonc/json.tmLanguage.json',
		'json_jsonc/no_comment.json',
	)

	json_grammars_test_helper('test/data/json_jsonc/jsonc.tmLanguage.json', 'json_jsonc/comment.json')
})

async function json_grammars_test_helper(grammar: string, in_file: string) {
	const reg = unwrap(register_grammars('test/data/json_jsonc/package.json', [grammar]))
	const src = read_data(in_file)
	const scope = reg.filenameToScope('.json')
	const tokens = await getVSCodeTokens(reg.registry, scope, src)
	const res = renderSnapshot(tokens, scope)
	const expected = read_data(in_file + '.snap')
	expect(res).toEqual(expected)
}
