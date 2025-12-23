import tm from 'vscode-textmate'
import type { GrammarTestFile, TestFailure } from './types.ts'

export { missingScopes_ }

export async function runGrammarTestCase(
	registry: tm.Registry,
	testCase: GrammarTestFile,
): Promise<TestFailure[]> {
	return registry.loadGrammar(testCase.metadata.scope).then((grammar: tm.IGrammar | null) => {
		if (!grammar) {
			throw new Error(`Could not load scope ${testCase.metadata.scope}`)
		}

		let ruleStack = tm.INITIAL

		const failures: TestFailure[] = []

		for (const assertion of testCase.test_lines) {
			const { line_nr: testCaseLineNumber, src: line, scope_asserts: scopeAssertions } = assertion
			const { tokens, ruleStack: ruleStack1 } = grammar.tokenizeLine(line, ruleStack)
			ruleStack = ruleStack1

			scopeAssertions.forEach(({ from, to, scopes: requiredScopes, excludes: excludedScopes }) => {
				const xs = tokens.filter((t) => from < t.endIndex && to > t.startIndex)
				if (xs.length === 0 && requiredScopes.length > 0) {
					failures.push({
						missing: requiredScopes,
						unexpected: [],
						actual: [],
						line: testCaseLineNumber - 1,
						srcLineText: line,
						start: from,
						end: to,
					} as TestFailure)
				} else {
					xs.forEach((token) => {
						const unexpected = excludedScopes.filter((s) => {
							return token.scopes.includes(s)
						})
						const missing = missingScopes_(requiredScopes, token.scopes)

						if (missing.length || unexpected.length) {
							failures.push({
								missing: missing,
								actual: token.scopes,
								unexpected: unexpected,
								line: testCaseLineNumber - 1,
								srcLineText: line,
								start: token.startIndex,
								end: token.endIndex,
							} as TestFailure)
						}
					})
				}
			})
		}

		return failures
	})
}

function missingScopes_(rs: string[], as: string[]): string[] {
	let i = 0,
		j = 0
	while (i < as.length && j < rs.length) {
		if (as[i] === rs[j]) {
			i++
			j++
		} else {
			i++
		}
	}

	return j === rs.length ? [] : rs.slice(j)
}
