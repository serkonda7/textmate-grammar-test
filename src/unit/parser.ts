import {
	type FileMetadata,
	type GrammarTestFile,
	new_line_assertion,
	type ScopeAssertion,
	type TestedLine,
} from './types.ts'

const R_COMMENT = '(?<comment>\\S+)' // non-whitespace characters
const R_SCOPE = '"(?<scope>[^"]+)"' // quoted string
const R_DESC = '(?:\\s+"(?<desc>[^"]+)")?' // optional: space and quoted string
const HEADER_REGEX = new RegExp(`^${R_COMMENT}\\s+SYNTAX\\s+TEST\\s+${R_SCOPE}${R_DESC}\\s*$`)

// Scope names are lowercase alphanumeric, `-` and are separated by dots
const SCOPE_RE = /[-\w]+(?:\.[-\w]+)*/g
// Laxer scope regex allowing: `+`
const LEGACY_SCOPE_RW = /[+-\w]+(?:\.[+-\w]+)*/g

// TODO add docs in readme explaining the modes
export enum ScopeRegexMode {
	standard,
	legacy,
}

// RegExp.escape polyfill for Node.js <= 24
if (!RegExp.escape) {
	RegExp.escape = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse header into metadata.
 *   Header format: <comment token> SYNTAX TEST "<scopeName>" "description"
 */
export function parseHeader(line: string): FileMetadata {
	const match = HEADER_REGEX.exec(line)

	// No header matched
	if (!match?.groups) {
		throw new SyntaxError('Invalid header', {
			cause: `Expected format: <comment token> SYNTAX TEST "<scopeName>" "description"`,
		})
	}

	return {
		comment_token: match.groups.comment,
		scope: match.groups.scope,
		description: match.groups.desc ?? '',
	}
}

export function parseTestFile(str: string): GrammarTestFile {
	const lines = str.split(/\r\n|\n/)

	if (lines.length <= 1) {
		throw new Error('Expected non-empty test')
	}

	const metadata = parseHeader(lines[0])
	const { comment_token } = metadata
	const line_assert_re = new RegExp(`\\s*${RegExp.escape(comment_token)}\\s*(\\^|<[~]*[-]+)`)

	function is_assertion(s: string): boolean {
		return line_assert_re.test(s)
	}

	// TODO actually allow the user to choose the mode
	const assert_parser = new AssertionParser(comment_token.length, ScopeRegexMode.standard)

	const lineAssertions: TestedLine[] = []
	let scope_assertions: ScopeAssertion[] = []
	let src_line_nr = 0

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		// Scope assertion line
		if (is_assertion(line)) {
			scope_assertions.push(assert_parser.parse_line(line))
			continue
		}

		// Store previous line assertion
		if (scope_assertions.length > 0) {
			lineAssertions.push(
				new_line_assertion(lines[src_line_nr], src_line_nr + 1, scope_assertions.slice()),
			)
		}

		// Reset for next source line
		src_line_nr = i
		scope_assertions = []
	}

	// Handle remaining assertions at EOF
	if (scope_assertions.length > 0) {
		lineAssertions.push(
			new_line_assertion(lines[src_line_nr], src_line_nr + 1, scope_assertions.slice()),
		)
	}

	return {
		metadata: metadata,
		test_lines: lineAssertions,
	}
}

export class AssertionParser {
	private comment_offset: number
	private scope_re: RegExp
	private line: string = ''
	private pos: number = 0

	constructor(comment_length: number, mode: ScopeRegexMode) {
		this.comment_offset = comment_length
		this.scope_re = mode === ScopeRegexMode.standard ? SCOPE_RE : LEGACY_SCOPE_RW
	}

	parse_line(_line: string): ScopeAssertion {
		this.line = _line
		this.pos = 0

		// Skip comment token and spaces around it
		this.skip_spaces()
		this.pos += this.comment_offset
		this.skip_spaces()

		const { from, to } = this.parse_assertion_range()
		const { scopes, excludes } = this.parse_scopes_and_exclusions()

		if (scopes.length === 0 && excludes.length === 0) {
			throw new SyntaxError('Assertion misses scopes')
		}

		return { from, to, scopes, excludes }
	}

	private skip_spaces(): void {
		while (this.line[this.pos] === ' ') {
			this.pos++
		}
	}

	private parse_assertion_range(): { from: number; to: number } {
		const start = this.pos

		const c = this.line[this.pos]
		this.pos++

		if (c === '^') {
			while (this.line[this.pos] === '^') {
				this.pos++
			}

			return { from: start, to: this.pos }
		}

		if (c === '<') {
			let nr_tildas = 0
			while (this.line[this.pos] === '~') {
				this.pos++
				nr_tildas++
			}

			let nr_dashes = 0
			while (this.line[this.pos] === '-') {
				this.pos++
				nr_dashes++
			}

			return {
				from: nr_tildas,
				to: nr_tildas + nr_dashes,
			}
		}

		throw new SyntaxError('Cannot parse assertion')
	}

	private parse_scopes_and_exclusions(): { scopes: string[]; excludes: string[] } {
		const remaining_line = this.line.slice(this.pos)
		const [scopes_part, excludes_part] = remaining_line.split(/\s+!\s+/, 2)

		let scopes: string[] = []
		let excludes: string[] = []

		if (scopes_part) {
			scopes = [...scopes_part.matchAll(this.scope_re)].map((m) => m[0])
		}

		if (excludes_part) {
			excludes = [...excludes_part.matchAll(this.scope_re)].map((m) => m[0])
		}

		return { scopes, excludes }
	}
}
