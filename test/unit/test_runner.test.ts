import { expect, test } from 'bun:test'
import { unwrap } from '../../src/lib/result.ts'
import { ScopeRegexMode, TestRunner } from '../../src/unit/index.ts'
import { read_testdata } from '../testutil.ts'

const grammars = [
	{
		scopeName: 'source.xy',
		path: './test/resources/testlang.tmLanguage.json',
	},
]

const runner = new TestRunner(grammars, ScopeRegexMode.standard)

test('line end', async () => {
	const res = unwrap(await runner.test_file(read_testdata('line_end.testlang')))

	expect(res).toHaveLength(2)
	expect(res[0].actual).toEqual(['EOL'])
})
