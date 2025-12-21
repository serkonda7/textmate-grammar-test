import { EOL } from 'node:os'
import type { GrammarTestCase, LineAssertion, ScopeAssertion, TestCaseMetadata } from './model.ts'

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

const HEADER_ERR_MSG = 'Invalid header'
const HEADER_ERR_CAUSE = `Expected format: <comment token> SYNTAX TEST "<scopeName>" "description"${EOL}`

const R_COMMENT = '(?<comment>\\S+)' // non-whitespace characters
const R_SCOPE = '"(?<scope>[^"]+)"' // quoted string
const R_DESC = '(?:\\s+"(?<desc>[^"]+)")?' // optional: space and quoted string
const HEADER_REGEX = new RegExp(`^${R_COMMENT}\\s+SYNTAX\\s+TEST\\s+${R_SCOPE}${R_DESC}\\s*$`)

/**
 * Parse first line header into metadata.
 *   Header format: <comment token> SYNTAX TEST "<scopeName>" "description"
 */
export function parseHeader(line: string): TestCaseMetadata {
	const match = HEADER_REGEX.exec(line)

	// No header matched
	if (!match?.groups) {
		throw new SyntaxError(HEADER_ERR_MSG, { cause: HEADER_ERR_CAUSE })
	}

	return {
		commentToken: match.groups.comment,
		scope: match.groups.scope,
		description: match.groups.desc ?? '',
	}
}

export function parseGrammarTestCase(str: string): GrammarTestCase {
	const headerLength = 1
	const lines = str.split(/\r\n|\n/)

	if (lines.length <= 1) {
		throw new Error('Expected non-empty test')
	}

	const metadata = parseHeader(lines[0])
	const { commentToken } = metadata
	const rest = lines.slice(headerLength)
	const commentTokenLength = commentToken.length

	function isLineAssertion(s: string): boolean {
		return s.startsWith(commentToken) && /^\s*(\^|<[~]*[-]+)/.test(s.substring(commentTokenLength))
	}

	function emptyLineAssertion(tcLineNumber: number, srcLineNumber: number): LineAssertion {
		return {
			testCaseLineNumber: tcLineNumber,
			sourceLineNumber: srcLineNumber,
			scopeAssertions: [],
		} as LineAssertion
	}

	let sourceLineNumber = 0
	const lineAssertions = [] as LineAssertion[]
	let currentLineAssertion = emptyLineAssertion(headerLength, 0)
	const source = [] as string[]
	rest.forEach((s: string, i: number) => {
		const tcLineNumber = headerLength + i

		if (s.startsWith(commentToken) && isLineAssertion(s)) {
			const as = parseScopeAssertion(tcLineNumber, commentToken.length, s)
			currentLineAssertion.scopeAssertions = [...currentLineAssertion.scopeAssertions, ...as]
		} else {
			if (currentLineAssertion.scopeAssertions.length !== 0) {
				lineAssertions.push(currentLineAssertion)
			}
			currentLineAssertion = emptyLineAssertion(tcLineNumber, sourceLineNumber)
			source.push(s)
			sourceLineNumber++
		}
	})
	if (currentLineAssertion.scopeAssertions.length !== 0) {
		lineAssertions.push(currentLineAssertion)
	}

	return {
		metadata: metadata,
		source: source,
		assertions: lineAssertions,
	} as GrammarTestCase
}
