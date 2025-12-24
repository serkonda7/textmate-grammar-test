import { err, ok, type Result } from '../lib/result.ts'
import {
	type FileMetadata,
	type GrammarTestFile,
	new_line_assertion,
	type ScopeAssertion,
	type TestedLine,
} from './types.ts'

//
// String definitions
//

const ERR_INVALID_HEADER = 'Invalid header'
const ERR_INVALID_HEADER_MSG =
	'Expected format: <comment token> SYNTAX TEST "<scopeName>" "description"'
const ERR_EMPTY_TEST = 'Expected non-empty test'

//
// Regex definitions
//

const R_COMMENT = '(?<comment>\\S+)' // non-whitespace characters
const R_SCOPE = '"(?<scope>[^"]+)"' // quoted string
const R_DESC = '(?:\\s+"(?<desc>[^"]+)")?' // optional: space and quoted string
const HEADER_REGEX = new RegExp(`^${R_COMMENT}\\s+SYNTAX\\s+TEST\\s+${R_SCOPE}${R_DESC}\\s*$`)

// TODO add docs in readme explaining the modes
export enum ScopeRegexMode {
	standard,
	legacy,
	permissive,
}

const REGEX_BY_MODE: Record<ScopeRegexMode, RegExp> = {
	// Names are lowercase alphanumeric, `-` and separated by dots
	[ScopeRegexMode.standard]: /[-\w]+(?:\.[-\w]+)*/g,

	// For legacy grammars allowing: `+`
	[ScopeRegexMode.legacy]: /[+-\w]+(?:\.[+-\w]+)*/g,

	// Any non-whitespace except dot
	[ScopeRegexMode.permissive]: /[^.\s]+(?:\.[^.\s]+)*/g,
}

// RegExp.escape polyfill for Node.js <= 24
if (!RegExp.escape) {
	RegExp.escape = (string) => String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

//
// Parser logic
//

/**
 * Parse header into metadata.
 *   Header format: <comment token> SYNTAX TEST "<scopeName>" "description"
 */
export function parseHeader(line: string): Result<FileMetadata, SyntaxError> {
	const match = HEADER_REGEX.exec(line)

	// No header matched
	if (!match?.groups) {
		return err(new SyntaxError(ERR_INVALID_HEADER, { cause: ERR_INVALID_HEADER_MSG }))
	}

	return ok({
		comment_token: match.groups.comment,
		scope: match.groups.scope,
		description: match.groups.desc ?? '',
	})
}

export function parseTestFile(
	str: string,
	mode: ScopeRegexMode = ScopeRegexMode.standard,
): GrammarTestFile {
	const lines = str.split(/\r\n|\n/)

	if (lines.length <= 1) {
		throw new Error(ERR_EMPTY_TEST)
	}

	const metadata = parseHeader(lines[0])
	if (metadata.error) {
		throw metadata.error
	}

	const { comment_token } = metadata.value
	const line_assert_re = new RegExp(`\\s*${RegExp.escape(comment_token)}\\s*(\\^|<[~]*[-]+)`)

	function is_assertion(s: string): boolean {
		return line_assert_re.test(s)
	}

	const assert_parser = new AssertionParser(comment_token.length, mode)

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
		metadata: metadata.value,
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
		this.scope_re = REGEX_BY_MODE[mode]
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
