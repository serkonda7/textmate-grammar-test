import type tm from 'vscode-textmate'

export interface AnnotatedLine {
	src: string
	tokens: [tm.IToken]
}
