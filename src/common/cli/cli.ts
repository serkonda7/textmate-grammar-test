export enum ExitCode {
	Success = 0,
	Failure = 1,
}

export const SYMBOLS = {
	ok: '✓',
	err: '✖',
	dot: '.',
	comma: ',',
	bang: '!',
}

if (process.platform === 'win32') {
	SYMBOLS.ok = '\u221A'
	SYMBOLS.err = '\u00D7'
}

export function array_opt(val: string, total: string[]): string[] {
	return total.concat([val])
}
