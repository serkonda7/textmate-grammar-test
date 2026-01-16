import { expect, test } from 'bun:test'
import { unwrap } from '@serkonda7/ts-result'
import { ScopeRegexMode, TestRunner } from '../../src/unit/index.ts'
import { read_data, TESTLANG_GRAMMARS } from '../testutil.ts'

const runner = new TestRunner(TESTLANG_GRAMMARS, ScopeRegexMode.standard)

test('line end', async () => {
	const res = unwrap(await runner.test_file(read_data('line_end.testlang')))

	expect(res.failures).toHaveLength(2)
	expect(res.failures[0].line).toEqual(2)
	expect(res.failures[1].line).toEqual(5)
})
