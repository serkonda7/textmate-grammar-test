#!/usr/bin/env node

import chalk from 'chalk'
import { program } from 'commander'
import * as fs from 'fs'
import { globSync } from 'glob'
import pLimit from 'p-limit'
import { createRegistry, loadConfiguration } from './common/index.ts'
import { VERSION } from './common/version.ts'
import { parseGrammarTestCase, runGrammarTestCase } from './unit/index.ts'
import type { GrammarTestCase } from './unit/model.ts'
import {
	CompositeReporter,
	ConsoleCompactReporter,
	ConsoleFullReporter,
	type Reporter,
	XunitGenericReporter,
	XunitGitlabReporter,
} from './unit/reporter.ts'

function collectGrammarOpts(value: string, previous: string[]): string[] {
	return previous.concat([value])
}

interface CliOptions {
	grammar: string[]
	config: string
	compact: boolean
	xunitReport?: string
	xunitFormat: 'generic' | 'gitlab'
}

program
	.description('Run Textmate grammar test cases using vscode-textmate')
	.option(
		'-g, --grammar <grammar>',
		"Path to a grammar file. Multiple options supported. 'scopeName' is taken from the grammar",
		collectGrammarOpts,
		[],
	)
	.option('--config <configuration.json>', 'Path to the language configuration, package.json by default')
	.option('-c, --compact', 'Display output in the compact format, which is easier to use with VSCode problem matchers')
	.option(
		'--xunit-report <report.xml>',
		'Path to directory where test reports in the XUnit format will be emitted in addition to console output',
	)
	.option(
		'--xunit-format <generic|gitlab>',
		'Format of XML reports generated when --xunit-report is used. `gitlab` format is suitable for viewing the results in GitLab CI/CD web GUI',
	)
	.version(VERSION)
	.argument(
		'<testcases...>',
		'A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!',
	)
	.parse(process.argv)

const options = program.opts<CliOptions>()

const TestFailed = -1
const TestSuccessful = 0
const MAX_CONCURRENT_TESTS = 8

const { grammars } = loadConfiguration(options.config, undefined, options.grammar)
const registry = createRegistry(grammars)

const consoleReporter = options.compact ? new ConsoleCompactReporter() : new ConsoleFullReporter()
const reporter: Reporter = options.xunitReport
	? new CompositeReporter(
			consoleReporter,
			options.xunitFormat === 'gitlab'
				? new XunitGitlabReporter(options.xunitReport)
				: new XunitGenericReporter(options.xunitReport),
		)
	: consoleReporter

const rawTestCases = program.args.flatMap((x) => globSync(x))

if (rawTestCases.length === 0) {
	console.log(chalk.red('ERROR') + ' no test cases found')
	process.exit(-1)
}

const limit = pLimit(MAX_CONCURRENT_TESTS)

const testResults: Promise<number[]> = Promise.all(
	rawTestCases.map((filename): Promise<number> => {
		let tc: GrammarTestCase | undefined
		try {
			tc = parseGrammarTestCase(fs.readFileSync(filename).toString())
		} catch (error) {
			reporter.reportParseError(filename, error)
			return new Promise((resolve) => {
				resolve(TestFailed)
			})
		}
		const testCase = tc as GrammarTestCase
		return limit(() => runGrammarTestCase(registry, testCase))
			.then((failures) => {
				reporter.reportTestResult(filename, testCase, failures)
				return failures.length === 0 ? TestSuccessful : TestFailed
			})
			.catch((error: any) => {
				reporter.reportGrammarTestError(filename, testCase, error)
				return TestFailed
			})
	}),
)

testResults.then((xs) => {
	reporter.reportSuiteResult()
	const result = xs.reduce((a, b) => a + b, 0)
	if (result === TestSuccessful) {
		process.exit(0)
	} else {
		process.exit(-1)
	}
})
