#!/usr/bin/env node

import fs from 'node:fs'
import { EOL } from 'node:os'
import path from 'node:path'
import { unwrap } from '@serkonda7/ts-result'
import chalk from 'chalk'
import { program } from 'commander'
import * as diff from 'diff'
import { globSync } from 'glob'
import { array_opt, ExitCode, SYMBOLS } from './common/cli'
import { register_grammars } from './common/textmate/index.ts'
import { getVSCodeTokens, parseSnap, renderSnapshot, type TokenizedLine } from './snapshot/index.ts'

interface CliOptions {
	updateSnapshot: boolean
	config: string
	printNotModified: boolean
	expandDiff: boolean
	grammar: string[]
}

program
	.description('Run VSCode textmate grammar snapshot tests')
	.option('-u, --updateSnapshot', 'overwrite all snap files with new changes')
	.option(
		'--config <configuration.json>',
		'Path to language configuration. Default: `package.json`',
		'package.json',
	)
	.option('--printNotModified', 'include not modified scopes in the output', false)
	.option('--expandDiff', 'produce each diff on two lines prefixed with "++" and "--"', false)
	.option(
		'-g, --grammar <grammar>',
		'Path to a grammar file. Multiple options supported.',
		array_opt,
		[],
	)
	.argument(
		'<testcases...>',
		'A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!',
	)
	.parse(process.argv)

async function main(): Promise<ExitCode> {
	const options = program.opts<CliOptions>()

	const rawTestCases = program.args.flatMap((x) => globSync(x))
	const testCases = rawTestCases.filter((x) => !x.endsWith('.snap'))

	// Early exit if no test cases found
	if (testCases.length === 0) {
		console.error(chalk.red('ERROR') + ' no test cases found')
		return ExitCode.Failure
	}

	const { registry, extToScope } = register_grammars(options.config, options.grammar)

	const results: ExitCode[] = []

	for (const filename of testCases) {
		const src = fs.readFileSync(filename, 'utf-8')
		const scope = extToScope(path.extname(filename))
		if (scope === undefined) {
			console.log(chalk.red('ERROR') + " can't run testcase: " + filename)
			console.log('No scope is associated with the file.')
			results.push(ExitCode.Failure)
			continue
		}

		const tokens = await getVSCodeTokens(registry, scope, src)
		if (fs.existsSync(filename + '.snap')) {
			if (options.updateSnapshot) {
				console.log(
					chalk.yellowBright('Updating snapshot for ') + chalk.whiteBright(filename + '.snap'),
				)
				const text = renderSnapshot(tokens, scope)
				fs.writeFileSync(filename + '.snap', text, 'utf-8')
				results.push(ExitCode.Success)
			} else {
				const snap_text = fs.readFileSync(filename + '.snap', 'utf-8')
				const expectedTokens = unwrap(parseSnap(snap_text))
				results.push(renderTestResult(filename, expectedTokens, tokens, options))
			}
		} else {
			console.log(
				chalk.yellowBright('Generating snapshot ') + chalk.whiteBright(filename + '.snap'),
			)
			const text = renderSnapshot(tokens, scope)
			fs.writeFileSync(filename + '.snap', text, 'utf-8')
			results.push(ExitCode.Success)
		}
	}

	return results.every((x) => x === ExitCode.Success) ? ExitCode.Success : ExitCode.Failure
}

main().then((code) => {
	process.exitCode = code
})

const Padding = '  '

function renderTestResult(
	filename: string,
	expected: TokenizedLine[],
	actual: TokenizedLine[],
	options: CliOptions,
): number {
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
						` source different snapshot at line ${i + 1}.${EOL} expected: ${exp.line}${EOL} actual: ${act.line}${EOL}`,
					),
			)
			return ExitCode.Failure
		}
	}

	// renderSnap won't produce assertions for empty lines, so we'll remove them here
	// for both actual end expected
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
						const changes = diff.diffArrays(e.scopes, a.scopes.map(scope => scope.replaceAll(/\s+/g, '')).filter(scope => scope))
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
					} else {
						return []
					}
				}),
			)

			const allChanges = modified
				.concat(added)
				.concat(removed)
				.sort((x, y) => (x.from - y.from) * 10000 + (x.to - y.to))
			if (allChanges.length > 0) {
				return [[allChanges, exp.line, i] as [TChanges[], string, number]]
			} else {
				return []
			}
		}),
	)

	if (wrongLines.length > 0) {
		console.log(chalk.red('ERROR in test case ') + chalk.whiteBright(filename))
		console.log(Padding + Padding + chalk.red('-- existing snapshot'))
		console.log(Padding + Padding + chalk.green('++ new changes'))
		console.log()

		if (options.expandDiff) {
			printDiffOnTwoLines(wrongLines, options)
		} else {
			printDiffInline(wrongLines, options)
		}

		console.log()
		return ExitCode.Failure
	} else {
		console.log(chalk.green(SYMBOLS.ok) + ' ' + chalk.whiteBright(filename) + ' run successfully.')
		return ExitCode.Success
	}
}

function printDiffInline(wrongLines: [TChanges[], string, number][], options: CliOptions) {
	wrongLines.forEach(([changes, src, i]) => {
		const lineNumberOffset = printSourceLine(src, i)
		changes.forEach((tchanges) => {
			const change = tchanges.changes
				.filter((c) => options.printNotModified || c.changeType !== NotModified)
				.map((c) => {
					const color =
						c.changeType === Added ? chalk.green : c.changeType === Removed ? chalk.red : chalk.gray
					return color(c.text)
				})
				.join(' ')
			printAccents(lineNumberOffset, tchanges.from, tchanges.to, change)
		})
		console.log()
	})
}

function printDiffOnTwoLines(wrongLines: [TChanges[], string, number][], options: CliOptions) {
	wrongLines.forEach(([changes, src, i]) => {
		const lineNumberOffset = printSourceLine(src, i)
		changes.forEach((tchanges) => {
			const removed = tchanges.changes
				.filter(
					(c) =>
						c.changeType === Removed || (c.changeType === NotModified && options.printNotModified),
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
			printAccents1(
				lineNumberOffset,
				tchanges.from,
				tchanges.to,
				chalk.red('-- ') + removed,
				Removed,
			)
			printAccents1(lineNumberOffset, tchanges.from, tchanges.to, chalk.green('++ ') + added, Added)
		})
		console.log()
	})
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

interface TChanges {
	changes: TChange[]
	from: number
	to: number
}

interface TChange {
	text: string
	changeType: number // 0 - not modified, 1 - removed, 2 - added
}

const NotModified = 0
const Removed = 1
const Added = 2

function printSourceLine(line: string, n: number): number {
	const pos = n + 1 + ': '

	console.log(Padding + chalk.gray(pos) + line)
	return pos.length
}

function printAccents(offset: number, from: number, to: number, diff: string) {
	const accents = ' '.repeat(from) + '^'.repeat(to - from)
	console.log(Padding + ' '.repeat(offset) + accents + ' ' + diff)
}

function printAccents1(offset: number, from: number, to: number, diff: string, change: number) {
	const color = change === Added ? chalk.green : change === Removed ? chalk.red : chalk.gray
	const prefix = change === Added ? '++' : change === Removed ? '--' : '  '
	const accents = color(' '.repeat(from) + '^'.repeat(to - from))
	console.log(color(prefix) + ' '.repeat(offset) + accents + ' ' + diff)
}
