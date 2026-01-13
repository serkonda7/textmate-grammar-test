import type tm from 'vscode-textmate'

export const SRC_PREFIX = '>'
export const TEST_PREFIX = '#'
export const TEST_PREFIX_LEN = TEST_PREFIX.length

export interface TokenizedLine {
	line: string
	tokens: tm.IToken[]
}
