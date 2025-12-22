import { EOL } from 'node:os'
import {
	type FileMetadata,
	type GrammarTestFile,
	new_line_assertion,
	type ScopeAssertion,
	type TestedLine,
} from './types.ts'

const HEADER_ERR_MSG = 'Invalid header'
const HEADER_ERR_CAUSE = `Expected format: <comment token> SYNTAX TEST "<scopeName>" "description"${EOL}`

const R_COMMENT = '(?<comment>\\S+)' // non-whitespace characters
const R_SCOPE = '"(?<scope>[^"]+)"' // quoted string
const R_DESC = '(?:\\s+"(?<desc>[^"]+)")?' // optional: space and quoted string
const HEADER_REGEX = new RegExp(`^${R_COMMENT}\\s+SYNTAX\\s+TEST\\s+${R_SCOPE}${R_DESC}\\s*$`)

/**
 * Parse header into metadata.
 *   Header format: <comment token> SYNTAX TEST "<scopeName>" "description"
 */
export function parseHeader(line: string): FileMetadata {
	const match = HEADER_REGEX.exec(line)

	// No header matched
	if (!match?.groups) {
		throw new SyntaxError(HEADER_ERR_MSG, { cause: HEADER_ERR_CAUSE })
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

	const assert_parser = new AssertionParser(comment_token.length)

	const lineAssertions: TestedLine[] = []
	let scope_assertions: ScopeAssertion[] = []
	let src_line_nr = 0

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		// Scope assertion line
		if (is_assertion(line)) {
			scope_assertions = scope_assertions.concat(assert_parser.parse_line(line))
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
	comment_offset: number
	line: string = ''
	pos: number = 0

	constructor(comment_length: number) {
		this.comment_offset = comment_length
	}

	parse_line(_line: string): ScopeAssertion[] {
		this.line = _line
		this.pos = 0

		const result: ScopeAssertion[] = []

		// TODO split this up into it's parts, basically the break at the end should not be needed as the loop stops after assertion type
		while (this.pos < this.line.length) {
			// Indentation, comment, spaces
			//   e.g. `    #    ^ source.xy`
			this.skip_spaces()
			this.pos += this.comment_offset
			this.skip_spaces()

			let start = this.pos
			let end = -1

			const c = this.line[this.pos]
			this.pos++

			// Parse assertion type
			if (c === '^') {
				while (this.line[this.pos] === '^') {
					this.pos++
				}

				end = this.pos
			} else if (c === '<') {
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

				start = nr_tildas
				end = start + nr_dashes
			} else {
				// TODO proper message and details
				throw new Error('')
			}

			// Parse scopes
			const SCOPE_RE = /\w+(?:\.[-\w]+)*/g

			const remaining_line = this.line.slice(this.pos)
			const [scopes_part, excludes_part] = remaining_line.split(/\s+!\s+/, 2)

			const scopes: string[] = []
			const exclusions: string[] = []

			if (scopes_part) {
				for (const match of scopes_part.matchAll(SCOPE_RE)) {
					scopes.push(match[0])
				}
			}

			if (excludes_part) {
				for (const match of excludes_part.matchAll(SCOPE_RE)) {
					exclusions.push(match[0])
				}
			}

			if (scopes.length === 0 && exclusions.length === 0) {
				// TODO proper message and details
				throw new Error('')
			}

			result.push({
				from: start,
				to: end,
				scopes: scopes,
				exclude: exclusions,
			} as ScopeAssertion)

			break
		}

		return result
	}

	skip_spaces(): void {
		while (this.line[this.pos] === ' ') {
			this.pos++
		}
	}
}
