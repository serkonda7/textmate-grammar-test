import { err, ok, type Result } from '@serkonda7/ts-result'
import type tm from 'vscode-textmate'
import { SRC_PREFIX, TEST_PREFIX, TEST_PREFIX_LEN, type TokenizedLine } from './types.ts'

/**
 * Parse existing snapshot file into tokenized lines.
 * Used for comparing to newly generated snapshots.
 */
export function parseSnap(text: string): Result<TokenizedLine[], Error> {
	const tokenized_lines: TokenizedLine[] = []

	const lines = text.split(/\n|\r\n/)

	let i = 0

	// Skip header. This check is for migration from older versions
	if (lines[0].startsWith('#')) {
		i++
	}

	while (i < lines.length) {
		const src_line = lines[i]
		i++ // Point to first test line

		// This should never happen in valid snapshot files
		if (!src_line.startsWith(SRC_PREFIX)) {
			return err(new Error(`Expected source line starting with '${SRC_PREFIX}'`))
		}

		// Get token tests for this source line
		const tokens: tm.IToken[] = []
		while (i < lines.length) {
			const line = lines[i]

			if (!line.startsWith(TEST_PREFIX)) {
				break
			}

			// Parse line
			const assert_start = line.indexOf('^')
			const assert_end = line.indexOf(' ', assert_start)
			const scopes = extract_scopes(line, assert_end + 1)

			tokens.push({
				startIndex: assert_start - TEST_PREFIX_LEN,
				endIndex: assert_end - TEST_PREFIX_LEN,
				scopes: scopes,
			})

			i++ // Next line
		}

		tokenized_lines.push({
			line: src_line.slice(1),
			tokens: tokens,
		})
	}

	return ok(tokenized_lines)
}

function extract_scopes(line: string, scopes_idx: number): string[] {
	return line
		.slice(scopes_idx)
		.split(' ')
		.filter((scope) => scope.length > 0)
}
