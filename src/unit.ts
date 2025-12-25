#!/usr/bin/env node

import * as fs from 'node:fs'
import chalk from 'chalk'
import { program } from 'commander'
import { globSync } from 'glob'
import pLimit from 'p-limit'
import { createRegistry, loadConfiguration } from './common/index.ts'
import { VERSION } from './common/version.ts'
import { unwrap } from './lib/result.ts'
import { parseTestFile } from './unit/index.ts'
import { createReporter } from './unit/reporter.ts'
import { runGrammarTestCase } from './unit/test_runner.ts'
import type { GrammarTestFile } from './unit/types.ts'

const MAX_CONCURRENT_TESTS = 8

enum ExitCode {
	Success = 0,
	Failure = 1,
}

interface CliOptions {
	grammar: string[]
	config: string
	compact: boolean
	xunitReport?: string
	xunitFormat: 'generic' | 'gitlab'
}

function collectGrammarOpts(value: string, previous: string[]): string[] {
	return previous.concat([value])
}

class TestCaseRunner {
	constructor(
		private readonly registry: ReturnType<typeof createRegistry>,
		private readonly reporter: ReturnType<typeof createReporter>,
	) {}

	async runSingleTest(filename: string): Promise<ExitCode> {
		let testCase: GrammarTestFile

		// Read and parse test case
		try {
			// TODO actually allow the user to choose the mode via cli flag
			testCase = unwrap(parseTestFile(fs.readFileSync(filename, 'utf8')))
		} catch (error) {
			this.reporter.reportParseError(filename, error)
			return ExitCode.Failure
		}

		// Execute test case
		try {
			const failures = await runGrammarTestCase(this.registry, testCase)
			this.reporter.reportTestResult(filename, testCase, failures)
			return failures.length === 0 ? ExitCode.Success : ExitCode.Failure
		} catch (error: any) {
			this.reporter.reportGrammarTestError(filename, testCase, error)
			return ExitCode.Failure
		}
	}

	async runTests(testFiles: string[]): Promise<ExitCode[]> {
		const limit = pLimit(MAX_CONCURRENT_TESTS)
		const tasks = testFiles.map((filename) => limit(() => this.runSingleTest(filename)))

		return Promise.all(tasks)
	}
}
async function main(): Promise<ExitCode> {
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
			'Path to language configuration. Default: `package.json`',
			'package.json',
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

	const { grammars } = loadConfiguration(options.config, undefined, options.grammar)

	const rawTestCases = program.args.flatMap((x) => globSync(x))

	// Early exit if no test cases found
	if (rawTestCases.length === 0) {
		console.error(chalk.red('ERROR') + ' no test cases found')
		process.exit(ExitCode.Failure)
	}

	const registry = createRegistry(grammars)
	const reporter = createReporter(options.compact, options.xunitFormat, options.xunitReport)

	const runner = new TestCaseRunner(registry, reporter)
	const results = await runner.runTests(rawTestCases)

	reporter.reportSuiteResult()
	return results.every((x) => x === ExitCode.Success) ? ExitCode.Success : ExitCode.Failure
}

main().then((code) => {
	process.exit(code)
})
