import { expect, test } from 'bun:test'
import { TestRunner } from '../../src/unit/index.ts'
import { REGISTRY, read_data } from '../testutil.ts'

const runner = new TestRunner(REGISTRY)

test('OK on correct grammar test', async () => {
	const res = (await runner.test_file(read_data('parser.testlang'))).unwrap()
	expect(res.failures).toHaveLength(0)
})

test('OK on whitespace scopes', async () => {
	const res = (await runner.test_file(read_data('whitespace_scope.testlang'))).unwrap()
	expect(res.failures).toHaveLength(0)
})

test('report missing scopes', async () => {
	const res = (await runner.test_file(read_data('missing.testlang'))).unwrap()
	expect(res.failures[0].missing).toEqual(['string.xy', 'variable.interpolation.xy'])
})

test('report unexpected scopes', async () => {
	const res = (await runner.test_file(read_data('unexpected.testlang'))).unwrap()
	expect(res.failures).toHaveLength(2)
	expect(res.failures[0].unexpected).toEqual(['source.xy'])
})

test('line end', async () => {
	const res = (await runner.test_file(read_data('line_end.testlang'))).unwrap()

	expect(res.failures).toHaveLength(2)
	expect(res.failures[0].line).toEqual(2)
	expect(res.failures[1].line).toEqual(5)
})

test('scopes in wrong order', async () => {
	const res = (await runner.test_file(read_data('order_wrong.testlang'))).unwrap()

	expect(res.failures).toHaveLength(1)
	expect(res.failures[0]).toEqual({
		missing: ['source.xy'],
		actual: ['source.xy', 'constant.int.xy'],
		unexpected: [],
		line: 2,
		srcLineText: 'var x = 123',
		start: 8,
		end: 11,
	})
})
