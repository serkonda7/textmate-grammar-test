import { expect, test } from 'bun:test'
import { unwrap } from '@serkonda7/ts-result'
import { ScopeRegexMode, TestRunner } from '../../src/unit/index.ts'
import { read_data, TESTLANG_GRAMMARS } from '../testutil.ts'

const runner = new TestRunner(TESTLANG_GRAMMARS, ScopeRegexMode.standard)

test('OK on correct grammar test', async () => {
	const res = unwrap(await runner.test_file(read_data('parser.testlang')))
	expect(res.failures).toHaveLength(0)
})

test('report missing scopes', async () => {
	const res = unwrap(await runner.test_file(read_data('missing.testlang')))
	expect(res.failures[0].missing).toEqual(['string.xy', 'variable.interpolation.xy'])
})

test('report unexpected scopes', async () => {
	const res = unwrap(await runner.test_file(read_data('unexpected.testlang')))
	expect(res.failures).toHaveLength(2)
	expect(res.failures[0].unexpected).toEqual(['source.xy'])
})

test('line end', async () => {
	const res = unwrap(await runner.test_file(read_data('line_end.testlang')))

	expect(res.failures).toHaveLength(2)
	expect(res.failures[0].line).toEqual(2)
	expect(res.failures[1].line).toEqual(5)
})
