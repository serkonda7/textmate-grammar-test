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
import { createReporter } from './unit/reporter.ts'

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
	.option(
		'--config <configuration.json>',
		'Path to the language configuration, package.json by default',
	)
	.option(
		'-c, --compact',
		'Display output in the compact format, which is easier to use with VSCode problem matchers',
	)
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

const MAX_CONCURRENT_TESTS = 8

enum ExitCode {
	Success = 0,
	Failure = 1,
}

const { grammars } = loadConfiguration(options.config, undefined, options.grammar)
const registry = createRegistry(grammars)

const reporter = createReporter(options.compact, options.xunitFormat, options.xunitReport)

const rawTestCases = program.args.flatMap((x) => globSync(x))

// Early exit if no test cases found
if (rawTestCases.length === 0) {
	console.log(chalk.red('ERROR') + ' no test cases found')
	process.exit(ExitCode.Failure)
}

const limit = pLimit(MAX_CONCURRENT_TESTS)

// Run tests in parallel
const testResults: Promise<number[]> = Promise.all(
	rawTestCases.map(async (filename): Promise<number> => {
		let testCase: GrammarTestCase

		// Read and parse test case
		try {
			testCase = parseGrammarTestCase(fs.readFileSync(filename, 'utf8'))
		} catch (error) {
			reporter.reportParseError(filename, error)
			return ExitCode.Failure
		}

		// Execute test case
		try {
			const failures = await limit(() => runGrammarTestCase(registry, testCase))
			reporter.reportTestResult(filename, testCase, failures)
			return failures.length === 0 ? ExitCode.Success : ExitCode.Failure
		} catch (error: any) {
			reporter.reportGrammarTestError(filename, testCase, error)
			return ExitCode.Failure
		}
	}),
)

// Process results
testResults.then((xs) => {
	reporter.reportSuiteResult()
	const success = xs.every((x) => x === ExitCode.Success)
	process.exit(success ? ExitCode.Success : ExitCode.Failure)
})
