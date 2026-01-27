import { err, ok, type Result } from '@serkonda7/ts-result'
import tm from 'vscode-textmate'
import { parse_file } from './index.ts'
import { find_overlapping_tokens, get_missing_scopes, get_unexpected_scopes } from './scopes.ts'
import type { TestFailure, TestResult } from './types.ts'

export class TestRunner {
	constructor(private registry: tm.Registry) {}

	async test_file(file_content: string): Promise<Result<TestResult>> {
		// Parse file
		const test_case_r = parse_file(file_content)
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

			for (const token of tokens) {
				const scopes = token.scopes
				for (let index = scopes.length - 1; index >= 0; index--) {
					const scope = scopes[index].replaceAll(/\s+/g, '')
					if (scope) {
						scopes[index] = scope
					} else {
						scopes.splice(index, 1)
					}
				}
			}

			scope_asserts.forEach(({ from, to, scopes: requiredScopes, excludes: excludedScopes }) => {
				const asserted_tokens = find_overlapping_tokens(tokens, from, to)

				// Fail on assertion beyond eol
				if (to > line_length && !is_root_scope_token(tokens, src_line.length)) {
					failures.push(this.eol_failure(line_nr, src_line, line_length, to))
					return
				}

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

// Entire line is one token
function is_root_scope_token(tokens: tm.IToken[], line_length: number): boolean {
	if (tokens.length !== 1) {
		return false
	}

	const tok = tokens[0]

	if (tok.startIndex > 0 || tok.endIndex < line_length) {
		return false
	}

	return tok.scopes.length === 1
}
