export type ExtensionManifest = Partial<{
	contributes: Partial<{
		grammars: Partial<Grammar>[]
		languages: Partial<Language>[]
	}>
}>

export interface Language {
	id: string
	extensions: string[]
	aliases: string[]
	filenames: string[]
}

export interface Grammar {
	path: string
	scopeName: string
	language: string
	embeddedLanguages?: Record<string, string>
	tokenTypes?: Record<string, string>
	injectTo?: string[]
}
