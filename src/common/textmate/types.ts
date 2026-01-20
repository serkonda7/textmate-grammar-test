export interface Grammar {
	path: string
	language?: string
	scopeName: string
	embeddedLanguages?: { [scopeName: string]: string }
	tokenTypes?: { [selector: string]: string }
	injectTo?: string[]
}
