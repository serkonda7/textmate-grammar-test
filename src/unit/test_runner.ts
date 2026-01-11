import tm from 'vscode-textmate'
import { createRegistry } from '../common/common/main.ts'
import type { IGrammarConfig } from '../common/common/types.ts'
import { err, ok, type Result } from '@serkonda7/ts-result'
import { parse_file, type ScopeRegexMode } from './index.ts'
import { find_overlapping_tokens, get_missing_scopes, get_unexpected_scopes } from './scopes.ts'
import type { TestFailure, TestResult } from './types.ts'

export class TestRunner {
	registry: tm.Registry

	constructor(
		grammars: IGrammarConfig[],
		private parse_mode: ScopeRegexMode,
	) {
		this.registry = createRegistry(grammars)
	}

	async test_file(file_content: string): Promise<Result<TestResult>> {
		// Parse file
		const test_case_r = parse_file(file_content, this.parse_mode)
		if (test_case_r.error) {
			return err(test_case_r.error)
		}

		const test_case = test_case_r.value

		// Load grammar
		const grammar = await this.registry.loadGrammar(test_case.metadata.scope)
		if (!grammar) {
			return err(new Error(`Could not load scope ${test_case.metadata.scope}`))
		}

		let prev_state = tm.INITIAL
		const failures: TestFailure[] = []

		for (const line of test_case.test_lines) {
			const { line_nr, src: src_line, scope_asserts } = line
			const line_length = src_line.length

			// Tokenize line
			const { tokens, ruleStack: new_state } = grammar.tokenizeLine(src_line, prev_state)
			prev_state = new_state

			scope_asserts.forEach(({ from, to, scopes: requiredScopes, excludes: excludedScopes }) => {
				// Fail on assertion beyond eol
				if (to > line_length) {
					failures.push(this.eol_failure(line_nr, src_line, line_length, to))
					return
				}

				const asserted_tokens = find_overlapping_tokens(tokens, from, to)

				// Check each asserted token
				asserted_tokens.forEach((token) => {
					const unexpected = get_unexpected_scopes(excludedScopes, token.scopes)
					const missing = get_missing_scopes(requiredScopes, token.scopes)

					// Add failure if any scopes are missing or unexpected
					if (missing.length || unexpected.length) {
						failures.push({
							missing: missing,
							actual: token.scopes,
							unexpected: unexpected,
							line: line_nr - 1,
							srcLineText: src_line,
							start: token.startIndex,
							end: token.endIndex,
						})
					}
				})
			})
		}

		return ok({
			test_case,
			failures,
		})
	}

	private eol_failure(line: number, src: string, from: number, to: number): TestFailure {
		return {
			missing: [],
			unexpected: [],
			actual: ['EOL'],
			line: line - 1,
			srcLineText: src,
			start: from,
			end: to,
		}
	}
}
