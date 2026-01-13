import type tm from 'vscode-textmate'
import type { LineWithTokens } from './types.ts'

const SRC_LINE_PREFIX = '>'
const TEST_LINE_PREFIX = '#'

export function parseSnap(s: string): LineWithTokens[] {
	const result: LineWithTokens[] = []
	const ls = s.split(/\r\n|\n/)
	let i = 0
	while (i < ls.length) {
		const l = ls[i]
		if (l.startsWith(SRC_LINE_PREFIX)) {
			const src = l.substring(1)
			i++
			const tokens: tm.IToken[] = []
			while (i < ls.length && ls[i].startsWith(TEST_LINE_PREFIX)) {
				const startIndex = ls[i].indexOf('^')
				const endIndex = ls[i].indexOf(' ', startIndex)
				const scopes = ls[i]
					.substring(endIndex + 1)
					.split(/\s+/)
					.filter((x) => x !== '')
				tokens.push({
					startIndex: startIndex - 1,
					endIndex: endIndex - 1,
					scopes: scopes,
				})
				i++
			}
			result.push(<LineWithTokens>{
				line: src,
				tokens: tokens,
			})
		} else {
			i++
		}
	}

	return result
}

export function renderSnapshot(lines_with_tokens: LineWithTokens[]): string {
	const snap: string[] = []

	for (const { line, tokens } of lines_with_tokens) {
		snap.push(SRC_LINE_PREFIX + line)
		snap.push(...render_tokens(tokens))
	}

	return snap.join('\n')
}

function render_tokens(tokens: tm.IToken[]) {
	const lines: string[] = []

	for (const token of tokens) {
		let line = TEST_LINE_PREFIX
		line += ' '.repeat(token.startIndex)
		line += '^'.repeat(token.endIndex - token.startIndex)
		line += ` ${token.scopes.join(' ')}`

		lines.push(line)
	}

	return lines
}
