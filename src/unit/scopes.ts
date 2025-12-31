import type tm from 'vscode-textmate'

export { find_overlapping_tokens, get_unexpected_scopes, get_missing_scopes }

function find_overlapping_tokens(tokens: tm.IToken[], from: number, to: number): tm.IToken[] {
	return tokens.filter((t) => {
		return from < t.endIndex && to > t.startIndex
	})
}

function get_unexpected_scopes(excluded: string[], actual: string[]): string[] {
	return excluded.filter((scope) => actual.includes(scope))
}

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
