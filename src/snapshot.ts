#!/usr/bin/env node

import * as fs from 'node:fs'
import { EOL } from 'node:os'
import * as path from 'node:path'
import chalk from 'chalk'
import { program } from 'commander'
import * as diff from 'diff'
import { globSync } from 'glob'
import pLimit from 'p-limit'
import { ExitCode } from './common/cli'
import { loadConfiguration } from './common/textmate/lang_config.ts'
import { createRegistry } from './common/textmate/textmate.ts'
import { getVSCodeTokens, parseSnap, renderSnap } from './snapshot/main.ts'
import type { AnnotatedLine } from './snapshot/types.ts'

interface CliOptions {
	updateSnapshot: boolean
	config: string
	printNotModified: boolean
	expandDiff: boolean
	grammar: string[]
	scope?: string
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
		"Path to a grammar file. Multiple options supported. 'scopeName' is taken from the grammar",
		(x, xs: string[]) => xs.concat([x]),
		[],
	)
	.option('-s, --scope <scope>', 'Explicitly specify scope of testcases, e.g. source.dhall')
	.argument(
		'<testcases...>',
		'A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!',
	)
	.parse(process.argv)

const options = program.opts<CliOptions>()

const symbols = {
	ok: '✓',
	err: '✖',
	dot: '․',
	comma: ',',
	bang: '!',
}

if (process.platform === 'win32') {
	symbols.ok = '\u221A'
	symbols.err = '\u00D7'
	symbols.dot = '.'
}

const Padding = '  '
const MAX_CONCURRENT_TESTS = 8

const rawTestCases = program.args.flatMap((x) => globSync(x))

const testCases = rawTestCases.filter((x) => !x.endsWith('.snap'))

// Early exit if no test cases found
if (testCases.length === 0) {
	console.log(
		chalk.red('ERROR') + " No testcases found. Got: '" + chalk.gray(program.args.join(',')) + "'",
	)
	process.exit(ExitCode.Failure)
}

const { grammars, extensionToScope } = loadConfiguration(
	options.config,
	options.scope,
	options.grammar,
)

const limit = pLimit(MAX_CONCURRENT_TESTS)

const registry = createRegistry(grammars)
const testResults: Promise<number[]> = Promise.all(
	testCases.map((filename) => {
		const src = fs.readFileSync(filename).toString()
		const scope = extensionToScope(path.extname(filename))
		if (scope === undefined) {
			console.log(chalk.red('ERROR') + " can't run testcase: " + chalk.whiteBright(filename))
			console.log('No scope is associated with the file.')
			return ExitCode.Failure
		}
		return limit(() => getVSCodeTokens(registry, scope, src))
			.then((tokens) => {
				if (fs.existsSync(filename + '.snap')) {
					if (options.updateSnapshot) {
						console.log(
							chalk.yellowBright('Updating snapshot for ') + chalk.whiteBright(filename + '.snap'),
						)
						fs.writeFileSync(filename + '.snap', renderSnap(tokens), 'utf8')
						return ExitCode.Success
					} else {
						const expectedTokens = parseSnap(fs.readFileSync(filename + '.snap').toString())
						return renderTestResult(filename, expectedTokens, tokens)
					}
				} else {
					console.log(
						chalk.yellowBright('Generating snapshot ') + chalk.whiteBright(filename + '.snap'),
					)
					fs.writeFileSync(filename + '.snap', renderSnap(tokens))
					return ExitCode.Success
				}
			})
			.catch((error) => {
				console.log(chalk.red('ERROR') + " can't run testcase: " + chalk.whiteBright(filename))
				console.log(error)
				return ExitCode.Failure
			})
	}),
)

testResults.then((xs) => {
	const result = xs.reduce((a, b) => a + b, 0)
	process.exitCode = result
})

function renderTestResult(
	filename: string,
	expected: AnnotatedLine[],
	actual: AnnotatedLine[],
): number {
	if (expected.length !== actual.length) {
		console.log(
			chalk.red('ERROR running testcase ') +
				chalk.whiteBright(filename) +
				chalk.red(` snapshot and actual file contain different number of lines.${EOL}`),
		)
		return ExitCode.Failure
	}

	for (let i = 0; i < expected.length; i++) {
		const exp = expected[i]
		const act = actual[i]
		if (exp.src !== act.src) {
			console.log(
				chalk.red('ERROR running testcase ') +
					chalk.whiteBright(filename) +
					chalk.red(
						` source different snapshot at line ${i + 1}.${EOL} expected: ${exp.src}${EOL} actual: ${act.src}${EOL}`,
					),
			)
			return ExitCode.Failure
		}
	}

	// renderSnap won't produce assertions for empty lines, so we'll remove them here
	// for both actual end expected
	const actual1 = actual.filter((a) => a.src.trim().length > 0)
	const expected1 = expected.filter((a) => a.src.trim().length > 0)

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
				return [[allChanges, exp.src, i] as [TChanges[], string, number]]
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
			printDiffOnTwoLines(wrongLines)
		} else {
			printDiffInline(wrongLines)
		}

		console.log()
		return ExitCode.Failure
	} else {
		console.log(chalk.green(symbols.ok) + ' ' + chalk.whiteBright(filename) + ' run successfully.')
		return ExitCode.Success
	}
}

function printDiffInline(wrongLines: [TChanges[], string, number][]) {
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

function printDiffOnTwoLines(wrongLines: [TChanges[], string, number][]) {
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
