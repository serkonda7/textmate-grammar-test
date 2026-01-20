import { describe, expect, it } from 'bun:test'
import child_process from 'node:child_process'
import fs from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import util from 'node:util'
import { normalize } from '../testutil.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const exec = util.promisify(child_process.exec)

// FIXME: assertions and done()
describe('snap test', () => {
	const root = process.cwd()

	it('should report wrong or missing scopes', async () => {
		return exec(
			`node ${root}/dist/snapshot.js ` +
				`--config ${root}/test/resources/package.json ` +
				`${__dirname}/resources/snap-simple-failure/simple.dhall`,
			{
				cwd: root,
				maxBuffer: 1024 * 512, // 512kb
			},
		)
			.then(() => {
				// biome-ignore lint: exec must throw
				throw new Error('should have failed')
			})
			.catch(({ stdout }) => {
				expect(normalize(stdout)).toEqual(
					normalize(
						fs
							.readFileSync(`${__dirname}/resources/snap-simple-failure/stdout.txt`)
							.toString()
							.replace(/<root>/, root),
					),
				)
			})
	})

	it('should report update snapshot', async () => {
		fs.copyFileSync(
			`${__dirname}/resources/snap-update-snapshot/ref.dhall.snap`,
			`${__dirname}/resources/snap-update-snapshot/simple.dhall.snap`,
		)
		await exec(
			`node ${root}/dist/snapshot.js ` +
				`--config ${root}/test/resources/package.json ` +
				`--updateSnapshot ` +
				`${__dirname}/resources/snap-update-snapshot/simple.dhall`,
			{
				cwd: root,
				maxBuffer: 1024 * 512, // 512kb
			},
		)

		await exec(
			`node ${root}/dist/snapshot.js ` +
				`--config ${root}/test/resources/package.json ` +
				`${__dirname}/resources/snap-update-snapshot/simple.dhall`,
			{
				cwd: root,
			},
		).then(({ stdout, stderr }) => {
			expect(normalize(stdout)).toEqual(
				normalize(
					`✓ ${root}/test/functional/resources/snap-update-snapshot/simple.dhall run successfully.\n`,
				),
			)
			expect(stderr).toEqual('')
		})
		fs.unlinkSync(`${__dirname}/resources/snap-update-snapshot/simple.dhall.snap`)
	})
})
