import { describe, expect, it } from 'bun:test'
import child_process from 'node:child_process'
import fs from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import { normalize } from '../helpers.test.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const exec = util.promisify(child_process.exec)

// FIXME: assertions and done()
describe('unit test', async () => {
	const root = process.cwd()

	it('should report OK for test without errors', () => {
		return exec(
			`node ${root}/dist/unit.js ` +
				`--grammar ${root}/test/resources/dhall.tmLanguage.json ` +
				`${__dirname}/resources/unit-ok-scenario/success.dhall`,
			{
				cwd: root,
			},
		).then(({ stdout, stderr }) => {
			expect(normalize(stdout.trim())).toEqual(
				normalize(
					`✓ ${root}/test/functional/resources/unit-ok-scenario/success.dhall run successfuly.`,
				),
			)
			expect(stderr).toEqual('')
		})
	})

	it('should report Unexpected scopes', () => {
		return exec(
			`node ${root}/dist/unit.js  ` +
				`--grammar ${root}/test/resources/dhall.tmLanguage.json ` +
				`${__dirname}/resources/unit-report-unexpected-scopes/unexpected.scopes.test.dhall`,
			{
				cwd: root,
			},
		)
			.then(() => {
				// biome-ignore lint: exec must throw
				throw new Error('should have failed')
			})
			.catch(({ stdout }) => {
				expect(normalize(stdout)).toStrictEqual(
					normalize(
						fs
							.readFileSync(`${__dirname}/resources/unit-report-unexpected-scopes/stdout.txt`)
							.toString()
							.replace(/<root>/g, root),
					),
				)
			})
	})
})
