import { EOL } from 'node:os'
import * as tty from 'node:tty'
import chalk from 'chalk'
import type { GrammarTestFile, TestFailure } from '../../unit/types.ts'
import { SYMBOLS } from '../cli'

export interface Reporter {
	reportTestResult(filename: string, testCase: GrammarTestFile, failures: TestFailure[]): void
	reportParseError(filename: string, error: any): void
	reportGrammarTestError(filename: string, testCase: GrammarTestFile, reason: any): void
	reportSuiteResult(): void
}

const Padding = '  '

const isatty = tty.isatty(1) && tty.isatty(2)
let terminalWidth = 75

if (isatty) {
	terminalWidth = (process.stdout as tty.WriteStream).getWindowSize()[0]
}

function handleGrammarTestError(filename: string, _testCase: GrammarTestFile, reason: any): void {
	console.log(
		chalk.red(SYMBOLS.err) + ' testcase ' + chalk.gray(filename) + ' aborted due to an error',
	)
	console.log(reason)
}

function handleParseError(filename: string, error: any): void {
	console.log(chalk.red('ERROR') + " can't parse testcase: " + chalk.whiteBright(filename) + '')
	console.log(error)
}

class ConsoleCompactReporter implements Reporter {
	reportTestResult(filename: string, testCase: GrammarTestFile, failures: TestFailure[]): void {
		if (failures.length === 0) {
			console.log(chalk.green(SYMBOLS.ok) + ' ' + chalk.whiteBright(filename) + ` run successfuly.`)
		} else {
			failures.forEach((failure) => {
				console.log(
					`ERROR ${filename}:${failure.line + 1}:${failure.start + 1}:${failure.end + 1} ${this.renderCompactErrorMsg(testCase, failure)}`,
				)
			})
		}
	}

	private renderCompactErrorMsg(_testCase: GrammarTestFile, failure: TestFailure): string {
		let res = ''
		if (failure.missing && failure.missing.length > 0) {
			res += `Missing required scopes: [ ${failure.missing.join(' ')} ] `
		}
		if (failure.unexpected && failure.unexpected.length > 0) {
			res += `Prohibited scopes: [ ${failure.unexpected.join(' ')} ] `
		}
		if (failure.actual !== undefined) {
			res += `actual scopes: [${failure.actual.join(' ')}]`
		}
		return res
	}

	reportParseError = handleParseError

	reportGrammarTestError = handleGrammarTestError

	reportSuiteResult(): void {}
}

class ConsoleFullReporter implements Reporter {
	reportTestResult(filename: string, testCase: GrammarTestFile, failures: TestFailure[]): void {
		if (failures.length === 0) {
			console.log(chalk.green(SYMBOLS.ok) + ' ' + chalk.whiteBright(filename) + ` run successfuly.`)
		} else {
			console.log(chalk.red(SYMBOLS.err + ' ' + filename + ' failed'))
			failures.forEach((failure) => {
				printAssertionLocation(filename, failure, Padding, console.log, chalk)
				printSourceLine(failure, Padding, terminalWidth, console.log, chalk)
				printReason(testCase, failure, Padding, console.log, chalk)

				console.log(EOL)
			})
			console.log('')
		}
	}

	reportParseError = handleParseError

	reportGrammarTestError = handleGrammarTestError

	reportSuiteResult(): void {}
}

function printAssertionLocation(
	filename: string,
	failure: TestFailure,
	padding: string,
	sink: (message: string) => void,
	colorizer: Colorizer,
) {
	const { l, s, e } = getCorrectedOffsets(failure)
	sink(padding + 'at [' + colorizer.whiteBright(`${filename}:${l}:${s}:${e}`) + ']:')
}

function getCorrectedOffsets(failure: TestFailure): {
	l: number
	s: number
	e: number
} {
	return {
		l: failure.line + 1,
		s: failure.start + 1,
		e: failure.end + 1,
	}
}

function printSourceLine(
	failure: TestFailure,
	padding: string,
	terminalWidth: number,
	sink: (message: string) => void,
	colorizer: Colorizer,
) {
	const pos = failure.line + 1 + ': '
	const accents = ' '.repeat(failure.start) + '^'.repeat(failure.end - failure.start)

	const termWidth = terminalWidth - pos.length - Padding.length - 5

	const trimLeft = failure.end > termWidth ? Math.max(0, failure.start - 8) : 0

	const line1 = failure.srcLineText.substr(trimLeft)
	const accents1 = accents.substr(trimLeft)

	sink(padding + colorizer.gray(pos) + line1.substr(0, termWidth))
	sink(padding + ' '.repeat(pos.length) + accents1.substr(0, termWidth))
}

function printReason(
	_testCase: GrammarTestFile,
	failure: TestFailure,
	padding: string,
	sink: (message: string) => void,
	colorizer: Colorizer,
) {
	if (failure.missing && failure.missing.length > 0) {
		sink(
			colorizer.red(padding + 'missing required scopes: ') +
				colorizer.gray(failure.missing.join(' ')),
		)
	}
	if (failure.unexpected && failure.unexpected.length > 0) {
		sink(
			colorizer.red(padding + 'prohibited scopes: ') + colorizer.gray(failure.unexpected.join(' ')),
		)
	}
	if (failure.actual !== undefined) {
		sink(colorizer.red(padding + 'actual: ') + colorizer.gray(failure.actual.join(' ')))
	}
}

interface Colorizer {
	red(text: string): string
	gray(text: string): string
	whiteBright(text: string): string
}

export function createConsoleReporter(compact: boolean) {
	return compact ? new ConsoleCompactReporter() : new ConsoleFullReporter()
}
