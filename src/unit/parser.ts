import { EOL } from 'node:os'
import {
	type GrammarTestFile,
	type TestedLine,
	new_line_assertion,
	type ScopeAssertion,
	type FileMetadata,
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
	const { comment_token: commentToken } = metadata
	const commentTokenLength = commentToken.length

	function isLineAssertion(s: string): boolean {
		return s.startsWith(commentToken) && /^\s*(\^|<[~]*[-]+)/.test(s.substring(commentTokenLength))
	}

	const lineAssertions: TestedLine[] = []
	let scope_assertions: ScopeAssertion[] = []
	let src_line_nr = 0

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		// Scope assertion line
		if (isLineAssertion(line)) {
			scope_assertions = scope_assertions.concat(parseScopeAssertion(i, commentToken.length, line))
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

const leftArrowAssertRegex =
	/^(\s*)<([~]*)([-]+)((?:\s*\w[-\w.]*)*)(?:\s*-)?((?:\s*\w[-\w.]*)*)\s*$/
const upArrowAssertRegex =
	/^\s*((?:(?:\^+)\s*)+)((?:\s*\w[-\w.]*)*)(?:\s*-)?((?:\s*\w[-\w.]*)*)\s*$/

export function parseScopeAssertion(
	testCaseLineNumber: number,
	commentLength: number,
	as: string,
): ScopeAssertion[] {
	const s = as.slice(commentLength)

	if (s.trim().startsWith('^')) {
		const upArrowMatch = upArrowAssertRegex.exec(s)
		if (upArrowMatch !== null) {
			const [, , scopes = '', exclusions = ''] = upArrowMatch

			if (scopes === '' && exclusions === '') {
				throw new Error(
					`Invalid assertion at line ${testCaseLineNumber}:${EOL}${as}${EOL} Missing both required and prohibited scopes`,
				)
			} else {
				const result = []
				let startIdx = s.indexOf('^')
				while (startIdx !== -1) {
					let endIndx = startIdx
					while (s[endIndx + 1] === '^') {
						endIndx++
					}
					result.push({
						from: commentLength + startIdx,
						to: commentLength + endIndx + 1,
						scopes: scopes.split(/\s+/).filter((x) => x),
						exclude: exclusions.split(/\s+/).filter((x) => x),
					} as ScopeAssertion)
					startIdx = s.indexOf('^', endIndx + 1)
				}
				return result
			}
		} else {
			throw new Error(`Invalid assertion at line ${testCaseLineNumber}:${EOL}${as}${EOL}`)
		}
	}

	const leftArrowMatch = leftArrowAssertRegex.exec(s)

	if (leftArrowMatch !== null) {
		const [, , tildas, dashes, scopes = '', exclusions = ''] = leftArrowMatch
		if (scopes === '' && exclusions === '') {
			throw new Error(
				`Invalid assertion at line ${testCaseLineNumber}:${EOL}${as}${EOL} Missing both required and prohibited scopes`,
			)
		} else {
			return [
				{
					from: tildas.length,
					to: tildas.length + dashes.length,
					scopes: scopes.split(/\s+/).filter((x) => x),
					exclude: exclusions.split(/\s+/).filter((x) => x),
				},
			]
		}
	}

	return []
}
