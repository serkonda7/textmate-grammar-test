import { IToken } from 'vscode-textmate'

export interface AnnotatedLine {
  src: string
  tokens: [IToken]
}
