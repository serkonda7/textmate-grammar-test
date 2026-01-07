#!/usr/bin/env node

import * as fs from 'node:fs'
import chalk from 'chalk'
import { program } from 'commander'
import { globSync } from 'glob'
import pLimit from 'p-limit'
import { createReporter } from './cli/reporter.ts'
import { loadConfiguration } from './common/index.ts'
import { ScopeRegexMode, TestRunner } from './unit/index.ts'

const MAX_CONCURRENT_TESTS = 8

enum ExitCode {
	Success = 0,
	Failure = 1,
}

interface CliOptions {
	grammar: string[]
	config: string
	scopeParser: ScopeRegexMode
	compact: boolean
	xunitReport?: string
	xunitFormat: 'generic' | 'gitlab'
}

function collectGrammarOpts(value: string, previous: string[]): string[] {
	return previous.concat([value])
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
			'--scope-parser <mode>',
			'Mode for parsing scopes in assertion lines. Options: standard, permissive',
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
		.argument(
			'<testcases...>',
			'A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!',
		)
		.parse(process.argv)

	const options = program.opts<CliOptions>()
	const scope_re_mode = options.scopeParser || ScopeRegexMode.standard

	const { grammars } = loadConfiguration(options.config, undefined, options.grammar)

	const rawTestCases = program.args.flatMap((x) => globSync(x))

	// Early exit if no test cases found
	if (rawTestCases.length === 0) {
		console.error(chalk.red('ERROR') + ' no test cases found')
		return ExitCode.Failure
	}

	const runner = new TestRunner(grammars, scope_re_mode)
	const reporter = createReporter(options.compact, options.xunitFormat, options.xunitReport)

	async function runSingleTest(filename: string): Promise<ExitCode> {
		const text = fs.readFileSync(filename, 'utf8')
		const res = await runner.test_file(text)
		if (res.error) {
			reporter.reportParseError(filename, res.error)
			return ExitCode.Failure
		}

		const test_res = res.value
		reporter.reportTestResult(filename, test_res.test_case, test_res.failures)
		return test_res.failures.length === 0 ? ExitCode.Success : ExitCode.Failure
	}

	const limit = pLimit(MAX_CONCURRENT_TESTS)
	const tasks = rawTestCases.map((filename) => limit(() => runSingleTest(filename)))

	const results = await Promise.all(tasks)

	reporter.reportSuiteResult()
	return results.every((x) => x === ExitCode.Success) ? ExitCode.Success : ExitCode.Failure
}

main().then((code) => {
	process.exitCode = code
})
