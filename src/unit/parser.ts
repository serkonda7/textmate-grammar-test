import { err, ok, type Result } from '@serkonda7/ts-result'
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
const ERR_ASSERT_NO_SCOPES = 'Assertion requires a scope'
const ERR_ASSERT_PARSE = 'Cannot parse assertion'

//
// Regex definitions
//

const R_COMMENT = '(?<comment>\\S+)' // non-whitespace characters
const R_SCOPE = '"(?<scope>[^"]+)"' // quoted string
const R_DESC = '(?:\\s+"(?<desc>[^"]+)")?' // optional: space and quoted string
const HEADER_REGEX = new RegExp(`^${R_COMMENT}\\s+SYNTAX\\s+TEST\\s+${R_SCOPE}${R_DESC}\\s*$`)

const SCOPE_REGEX = /[^.\s]+(?:\.[^.\s]+)*/g

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

export function parse_file(str: string): Result<GrammarTestFile, Error> {
	const lines = str.split(/\r\n|\n/)

	if (lines.length <= 1) {
		return err(new Error(ERR_EMPTY_TEST))
	}

	const metadata = parseHeader(lines[0])
	if (metadata.error) {
		return err(metadata.error)
	}

	const { comment_token } = metadata.value
	const line_assert_re = new RegExp(`\\s*${RegExp.escape(comment_token)}\\s*(\\^|<[~]*[-]+)`)

	function is_assertion(s: string): boolean {
		return line_assert_re.test(s)
	}

	const assert_parser = new AssertionParser(comment_token.length)

	const lineAssertions: TestedLine[] = []
	let scope_assertions: ScopeAssertion[] = []
	let src_line_nr = 0

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		// Scope assertion line
		if (is_assertion(line)) {
			const assertion = assert_parser.parse_line(line)
			if (assertion.error) {
				return err(assertion.error)
			}

			scope_assertions.push(assertion.value)
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

	return ok({
		metadata: metadata.value,
		test_lines: lineAssertions,
	})
}

export class AssertionParser {
	constructor(private readonly comment_length: number) {}

	parse_line(line: string): Result<ScopeAssertion, SyntaxError> {
		let pos = 0

		// Skip comment token and whitespace around
		pos = this.skip_whitespace(line, pos)
		pos += this.comment_length
		pos = this.skip_whitespace(line, pos)

		const rangeResult = this.parse_assertion_range(line, pos)
		if (rangeResult.error) {
			return err(rangeResult.error)
		}

		const { from, to, nextPos } = rangeResult.value
		const { scopes, excludes } = this.parse_scopes_and_exclusions(line.slice(nextPos))

		if (scopes.length === 0 && excludes.length === 0) {
			return err(new SyntaxError(ERR_ASSERT_NO_SCOPES))
		}

		return ok({ from, to, scopes, excludes })
	}

	private skip_whitespace(line: string, pos: number): number {
		while (pos < line.length && /\s/.test(line[pos])) {
			pos++
		}
		return pos
	}

	private parse_assertion_range(
		line: string,
		pos: number,
	): Result<{ from: number; to: number; nextPos: number }, SyntaxError> {
		const start = pos
		const c = line[pos]

		if (c === '^') {
			let current = pos
			while (line[current] === '^') {
				current++
			}
			return ok({ from: start, to: current, nextPos: current })
		}

		if (c === '<') {
			let current = pos + 1
			let nr_tildas = 0
			while (line[current] === '~') {
				current++
				nr_tildas++
			}

			let nr_dashes = 0
			while (line[current] === '-') {
				current++
				nr_dashes++
			}

			return ok({
				from: nr_tildas,
				to: nr_tildas + nr_dashes,
				nextPos: current,
			})
		}

		return err(new SyntaxError(ERR_ASSERT_PARSE))
	}

	/**
	 * Parse scopes and prohibited scopes (exclusions).
	 * Format: scope.a scope.b ! prohibited.scope.c prohibited.scope.d
	 */
	private parse_scopes_and_exclusions(remaining: string): { scopes: string[]; excludes: string[] } {
		const [scopes_part, excludes_part] = remaining.split(/\s+!\s+/, 2)

		// Extract all scope names using the SCOPE_REGEX.
		// matchAll returns an iterator of matches, which we spread into an array and map to the first capture group.
		const scopes = scopes_part ? [...scopes_part.matchAll(SCOPE_REGEX)].map((m) => m[0]) : []
		const excludes = excludes_part ? [...excludes_part.matchAll(SCOPE_REGEX)].map((m) => m[0]) : []

		return { scopes, excludes }
	}
}
