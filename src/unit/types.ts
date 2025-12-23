// Metadata taken from file header
export interface FileMetadata {
	comment_token: string
	scope: string
	description: string
}

export interface ScopeAssertion {
	from: number // note the 0 index
	to: number // exclusive
	scopes: string[]
	excludes: string[]
}

export interface TestedLine {
	src: string // Content of the line being tested
	line_nr: number
	scope_asserts: ScopeAssertion[]
}

export interface GrammarTestFile {
	metadata: FileMetadata
	test_lines: TestedLine[]
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

//
// Constructor-like helper functions
//

export function new_line_assertion(
	src: string,
	line_nr: number,
	scope_asserts: ScopeAssertion[],
): TestedLine {
	return {
		src: src,
		line_nr: line_nr,
		scope_asserts: scope_asserts,
	}
}
