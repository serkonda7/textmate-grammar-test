#!/usr/bin/env node

import * as fs from 'node:fs'
import { unwrap } from '@serkonda7/ts-result'
import chalk from 'chalk'
import { program } from 'commander'
import { globSync } from 'glob'
import { array_opt, ExitCode } from './common/cli'
import { createReporter } from './common/reporter/index.ts'
import { register_grammars } from './common/textmate/index.ts'
import { TestRunner } from './unit/index.ts'

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
		array_opt,
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
	.argument(
		'<testcases...>',
		'A glob pattern(s) which specifies testcases to run, e.g. "./tests/**/test*.dhall". Quotes are important!',
	)
	.parse(process.argv)

async function main(): Promise<ExitCode> {
	const options = program.opts<CliOptions>()

	const test_cases = program.args.flatMap((x) => globSync(x))

	// Early exit if no test cases found
	if (test_cases.length === 0) {
		console.error(chalk.red('ERROR') + ' no test cases found')
		return ExitCode.Failure
	}

	const { registry } = unwrap(register_grammars(options.config, options.grammar))
	const runner = new TestRunner(registry)
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

	const results: ExitCode[] = []

	for (const filename of test_cases) {
		const result = await runSingleTest(filename)
		results.push(result)
	}

	reporter.reportSuiteResult()

	return results.every((x) => x === ExitCode.Success) ? ExitCode.Success : ExitCode.Failure
}

main().then((code) => {
	process.exitCode = code
})
