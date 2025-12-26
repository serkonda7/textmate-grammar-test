import tm from 'vscode-textmate'
import { err, ok, type Result } from '../lib/result.ts'
import { parse_file, type ScopeRegexMode } from './index.ts'
import type { GrammarTestFile, TestFailure } from './types.ts'

export { get_missing_scopes as missingScopes_ }

function find_overlapping_tokens(tokens: tm.IToken[], from: number, to: number): tm.IToken[] {
	return tokens.filter((t) => {
		console.log(t)
		return from < t.endIndex && to > t.startIndex
	})
}

export class TestRunner {
	test_case: GrammarTestFile

	constructor(private readonly registry: tm.Registry) {
		this.test_case = {} as GrammarTestFile
	}

	async test_file(
		file_content: string,
		parse_mode: ScopeRegexMode,
	): Promise<Result<TestFailure[]>> {
		const test_case_r = parse_file(file_content, parse_mode)
		if (test_case_r.error) {
			return err(test_case_r.error)
		}

		this.test_case = test_case_r.value

		const grammar = await this.registry.loadGrammar(this.test_case.metadata.scope)
		if (!grammar) {
			return err(new Error(`Could not load scope ${this.test_case.metadata.scope}`))
		}

		let prev_state = tm.INITIAL
		const failures: TestFailure[] = []

		for (const assertion of this.test_case.test_lines) {
			const { line_nr, src: src_line, scope_asserts } = assertion
			const { tokens, ruleStack: new_state } = grammar.tokenizeLine(src_line, prev_state)
			prev_state = new_state

			scope_asserts.forEach(({ from, to, scopes: requiredScopes, excludes: excludedScopes }) => {
				const asserted_tokens = find_overlapping_tokens(tokens, from, to)

				// No asserts matched to tokens
				if (asserted_tokens.length === 0 && requiredScopes.length > 0) {
					failures.push({
						missing: requiredScopes,
						unexpected: [],
						actual: [],
						line: line_nr - 1,
						srcLineText: src_line,
						start: from,
						end: to,
					})
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

		return ok(failures)
	}
}

function get_unexpected_scopes(excluded: string[], actual: string[]): string[] {
	return excluded.filter((scope) => actual.includes(scope))
}

// TODO won't this report false positives if required scopes are not contiguous in actual?
function get_missing_scopes(required: string[], actual: string[]): string[] {
	let required_idx = 0

	for (const scope of actual) {
		if (scope === required[required_idx]) {
			required_idx++

			if (required_idx === required.length) {
				return []
			}
		}
	}

	return required.slice(required_idx)
}
