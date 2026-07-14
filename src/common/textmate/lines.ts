/**
 * Split text into lines, handling common line endings.
 *
 * Note: Order of matching matters!
 */
export function splitLines(text: string): string[] {
	return text.split(/\r\n|\n/)
}
