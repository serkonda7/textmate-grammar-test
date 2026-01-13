import type tm from 'vscode-textmate'
import type { AnnotatedLine } from './types.ts'

const SRC_LINE_PREFIX = '>'
const TEST_LINE_PREFIX = '#'

export function parseSnap(s: string): AnnotatedLine[] {
	const result: AnnotatedLine[] = []
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
			result.push(<AnnotatedLine>{
				src: src,
				tokens: tokens,
			})
		} else {
			i++
		}
	}

	return result
}

export function renderSnap(xs: AnnotatedLine[]): string {
	const result: string[] = []
	xs.forEach((line) => {
		result.push(SRC_LINE_PREFIX + line.src)
		if (line.src.trim().length > 0) {
			line.tokens.forEach((token) => {
				result.push(
					TEST_LINE_PREFIX +
						' '.repeat(token.startIndex) +
						'^'.repeat(token.endIndex - token.startIndex) +
						' ' +
						token.scopes.join(' '),
				)
			})
		}
	})
	return result.join('\n')
}
