import type tm from 'vscode-textmate'

export interface LineWithTokens {
	line: string
	tokens: [tm.IToken]
}
