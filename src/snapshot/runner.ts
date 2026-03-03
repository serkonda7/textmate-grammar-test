import fs from 'node:fs'
import { EOL } from 'node:os'
import path from 'node:path'
import chalk from 'chalk'
import * as diff from 'diff'
import type tm from 'vscode-textmate'
import { ExitCode, SYMBOLS } from '../common/cli/index.ts'
import { getVSCodeTokens, parseSnap, renderSnapshot } from './index.ts'
import { Added, NotModified, Removed, type TChanges, type TokenizedLine } from './types.ts'

export interface SnapshotOptions {
	updateSnapshot: boolean
	printNotModified: boolean
	expandDiff: boolean
	outdir: string
}

const Padding = '  '

export class SnapshotRunner {
	constructor(
		private registry: tm.Registry,
		private filenameToScope: (filename: string) => string,
	) {}

	async run(testFile: string, options: SnapshotOptions): Promise<ExitCode> {
		const src = fs.readFileSync(testFile, 'utf-8')
		const scope = this.filenameToScope(path.basename(testFile))
		if (scope.length === 0) {
			console.log(chalk.red('ERROR') + " can't run testcase: " + testFile)
			console.log('No scope is associated with the file.')
			return ExitCode.Failure
		}

		const tokens = await getVSCodeTokens(this.registry, scope, src)
		const out_name =
			options.outdir.length > 0 ? path.join(options.outdir, path.basename(testFile)) : testFile
		const out_file = out_name + '.snap'

		if (fs.existsSync(out_file)) {
			if (options.updateSnapshot) {
				console.log(chalk.yellowBright('Updating snapshot for ') + chalk.whiteBright(out_file))
				const text = renderSnapshot(tokens, scope)
				fs.writeFileSync(out_file, text, 'utf-8')
				return ExitCode.Success
			}

			const snap_text = fs.readFileSync(out_file, 'utf-8')
			// We skip the result from unwrap and use it directly for simplicity here,
			// but we should probably handle errors properly.
			// For now, keeping it consistent with the original code.
			const parseResult = parseSnap(snap_text)
			if (parseResult.error) {
				console.log(
					chalk.red('ERROR parsing snapshot ') +
						chalk.whiteBright(out_file) +
						': ' +
						parseResult.error,
				)
				return ExitCode.Failure
			}
			const expectedTokens = parseResult.value
			return this.renderTestResult(out_name, expectedTokens, tokens, options)
		}

		console.log(chalk.yellowBright('Generating snapshot ') + chalk.whiteBright(out_file))
		const text = renderSnapshot(tokens, scope)
		fs.writeFileSync(out_file, text, 'utf-8')
		return ExitCode.Success
	}

	private renderTestResult(
		filename: string,
		expected: TokenizedLine[],
		actual: TokenizedLine[],
		options: SnapshotOptions,
	): ExitCode {
		if (expected.length !== actual.length) {
			console.log(
				chalk.red('ERROR running testcase ') +
					chalk.whiteBright(filename) +
					chalk.red(` snapshot and actual file contain different number of lines.`),
			)
			return ExitCode.Failure
		}

		for (let i = 0; i < expected.length; i++) {
			const exp = expected[i]
			const act = actual[i]
			if (exp.line !== act.line) {
				console.log(
					chalk.red('ERROR running testcase ') +
						chalk.whiteBright(filename) +
						chalk.red(
							` source different snapshot at line ${
								i + 1
							}.${EOL} expected: ${exp.line}${EOL} actual: ${act.line}${EOL}`,
						),
				)
				return ExitCode.Failure
			}
		}

		const actual1 = actual.filter((a) => a.line.trim().length > 0)
		const expected1 = expected.filter((a) => a.line.trim().length > 0)

		const wrongLines = flatten(
			expected1.map((exp, i) => {
				const act = actual1[i]

				const expTokenMap = toMap((t) => `${t.startIndex}:${t.startIndex}`, exp.tokens)
				const actTokenMap = toMap((t) => `${t.startIndex}:${t.startIndex}`, act.tokens)

				const removed = exp.tokens
					.filter((t) => actTokenMap[`${t.startIndex}:${t.startIndex}`] === undefined)
					.map((t) => {
						return {
							changes: [
								{
									text: t.scopes.join(' '),
									changeType: Removed,
								},
							],
							from: t.startIndex,
							to: t.endIndex,
						} as TChanges
					})
				const added = act.tokens
					.filter((t) => expTokenMap[`${t.startIndex}:${t.startIndex}`] === undefined)
					.map((t) => {
						return {
							changes: [
								{
									text: t.scopes.join(' '),
									changeType: Added,
								},
							],
							from: t.startIndex,
							to: t.endIndex,
						} as TChanges
					})

				const modified = flatten(
					act.tokens.map((a) => {
						const e = expTokenMap[`${a.startIndex}:${a.startIndex}`]
						if (e !== undefined) {
							const changes = diff.diffArrays(e.scopes, a.scopes)
							if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
								return []
							}

							const tchanges = changes.map((change) => {
								const changeType = change.added ? Added : change.removed ? Removed : NotModified
								return {
									text: change.value.join(' '),
									changeType: changeType,
								}
							})
							return [
								{
									changes: tchanges,
									from: a.startIndex,
									to: a.endIndex,
								} as TChanges,
							]
						}
						return []
					}),
				)

				const allChanges = modified
					.concat(added)
					.concat(removed)
					.sort((x, y) => (x.from - y.from) * 10000 + (x.to - y.to))
				if (allChanges.length > 0) {
					return [[allChanges, exp.line, i] as [TChanges[], string, number]]
				}
				return []
			}),
		)

		if (wrongLines.length > 0) {
			console.log(chalk.red('ERROR in test case ') + chalk.whiteBright(filename))
			console.log(Padding + Padding + chalk.red('-- existing snapshot'))
			console.log(Padding + Padding + chalk.green('++ new changes'))
			console.log()

			if (options.expandDiff) {
				this.printDiffOnTwoLines(wrongLines, options)
			} else {
				this.printDiffInline(wrongLines, options)
			}

			console.log()
			return ExitCode.Failure
		}

		console.log(chalk.green(SYMBOLS.ok) + ' ' + chalk.whiteBright(filename) + ' run successfully.')
		return ExitCode.Success
	}

	private printDiffInline(wrongLines: [TChanges[], string, number][], options: SnapshotOptions) {
		wrongLines.forEach(([changes, src, i]) => {
			const lineNumberOffset = this.printSourceLine(src, i)
			changes.forEach((tchanges) => {
				const change = tchanges.changes
					.filter((c) => options.printNotModified || c.changeType !== NotModified)
					.map((c) => {
						const color =
							c.changeType === Added
								? chalk.green
								: c.changeType === Removed
									? chalk.red
									: chalk.gray
						return color(c.text)
					})
					.join(' ')
				this.printAccents(lineNumberOffset, tchanges.from, tchanges.to, change)
			})
			console.log()
		})
	}

	private printDiffOnTwoLines(
		wrongLines: [TChanges[], string, number][],
		options: SnapshotOptions,
	) {
		wrongLines.forEach(([changes, src, i]) => {
			const lineNumberOffset = this.printSourceLine(src, i)
			changes.forEach((tchanges) => {
				const removed = tchanges.changes
					.filter(
						(c) =>
							c.changeType === Removed ||
							(c.changeType === NotModified && options.printNotModified),
					)
					.map((c) => {
						return chalk.red(c.text)
					})
					.join(' ')
				const added = tchanges.changes
					.filter(
						(c) =>
							c.changeType === Added || (c.changeType === NotModified && options.printNotModified),
					)
					.map((c) => {
						return chalk.green(c.text)
					})
					.join(' ')
				this.printAccents1(
					lineNumberOffset,
					tchanges.from,
					tchanges.to,
					chalk.red('-- ') + removed,
					Removed,
				)
				this.printAccents1(
					lineNumberOffset,
					tchanges.from,
					tchanges.to,
					chalk.green('++ ') + added,
					Added,
				)
			})
			console.log()
		})
	}

	private printSourceLine(line: string, n: number): number {
		const pos = n + 1 + ': '

		console.log(Padding + chalk.gray(pos) + line)
		return pos.length
	}

	private printAccents(offset: number, from: number, to: number, diff: string) {
		const accents = ' '.repeat(from) + '^'.repeat(to - from)
		console.log(Padding + ' '.repeat(offset) + accents + ' ' + diff)
	}

	private printAccents1(offset: number, from: number, to: number, diff: string, change: number) {
		const color = change === Added ? chalk.green : change === Removed ? chalk.red : chalk.gray
		const prefix = change === Added ? '++' : change === Removed ? '--' : '  '
		const accents = color(' '.repeat(from) + '^'.repeat(to - from))
		console.log(color(prefix) + ' '.repeat(offset) + accents + ' ' + diff)
	}
}

function toMap<T>(f: (x: T) => string, xs: T[]): { [key: string]: T } {
	return xs.reduce((m: { [key: string]: T }, x: T) => {
		m[f(x)] = x
		return m
	}, {})
}

function flatten<T>(arr: T[][]): T[] {
	return arr.reduce((acc, val) => acc.concat(val), [])
}
