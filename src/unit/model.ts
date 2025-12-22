// Metadata taken from file header
export interface TestCaseMetadata {
	commentToken: string
	scope: string
	description: string
}

export interface ScopeAssertion {
	from: number // note the 0 index
	to: number // exclusive
	scopes: string[]
	exclude: string[]
}

export interface LineAssertion {
	source_line: string // Content of the line being asserted
	// TODO change to true line number (1 indexing)
	line_number: number // Source line number in the file (0 indexed)
	scopeAssertions: ScopeAssertion[]
}

export interface GrammarTestFile {
	metadata: TestCaseMetadata
	assertions: LineAssertion[]
}

export interface TestFailure {
	missing: string[]
	actual: string[]
	unexpected: string[]
	line: number
	srcLineText: string
	start: number
	end: number
}
