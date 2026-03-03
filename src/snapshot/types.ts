import type tm from 'vscode-textmate'

export const SRC_PREFIX = '>'
export const TEST_PREFIX = '#'
export const TEST_PREFIX_LEN = TEST_PREFIX.length

export interface TokenizedLine {
	line: string
	tokens: tm.IToken[]
}

export interface TChanges {
	changes: TChange[]
	from: number
	to: number
}

export interface TChange {
	text: string
	changeType: number // 0 - not modified, 1 - removed, 2 - added
}

export const NotModified = 0
export const Removed = 1
export const Added = 2
