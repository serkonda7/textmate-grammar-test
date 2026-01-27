import { expect, test } from 'bun:test'
import { unwrap } from '@serkonda7/ts-result'
import { TestRunner } from '../../src/unit/index.ts'
import { REGISTRY, read_data } from '../testutil.ts'

const runner = new TestRunner(REGISTRY)

test('.snap files pass unit test', async () => {
	const text = read_data('snap/snap.testlang.snap')
	const res = unwrap(await runner.test_file(text))
	expect(res.failures).toHaveLength(0)
})
