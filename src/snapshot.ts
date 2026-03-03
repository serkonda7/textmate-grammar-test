#!/usr/bin/env node

import { unwrap } from '@serkonda7/ts-result'
import chalk from 'chalk'
import { program } from 'commander'
import { globSync } from 'glob'
import { array_opt, ExitCode } from './common/cli/index.ts'
import { register_grammars } from './common/textmate/index.ts'
import { SnapshotRunner } from './snapshot/index.ts'

interface CliOptions {
	updateSnapshot: boolean
	config: string
	grammar: string[]
	outdir: string
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
	.option(
		'-g, --grammar <grammar>',
		'A glob pattern to grammar file(s). Multiple options supported.',
		array_opt,
		[],
	)
	.option('-o, --outdir <outdir>', 'Specify output directory of testcases', '')
	.option('-s, --scope <scope>', 'Explicitly specify scope of testcases, e.g. source.xy')
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

	const { registry, filenameToScope } = unwrap(
		register_grammars(options.config, options.grammar, options.scope),
	)

	const runner = new SnapshotRunner(registry, filenameToScope)
	const results: ExitCode[] = []

	for (const test_file of testCases) {
		results.push(await runner.run(test_file, options))
	}

	return results.every((x) => x === ExitCode.Success) ? ExitCode.Success : ExitCode.Failure
}

main().then((code) => {
	process.exitCode = code
})
