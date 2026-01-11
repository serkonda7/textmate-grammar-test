import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import oniguruma from 'vscode-oniguruma'
import type { IOnigLib } from 'vscode-textmate'

export async function createOnigurumaLib(): Promise<IOnigLib> {
	// Resolve oniguruma wasm path
	const onig_url = new URL(import.meta.resolve('vscode-oniguruma'))
	const onig_dir = path.dirname(url.fileURLToPath(onig_url))
	const wasm_path = path.join(onig_dir, 'onig.wasm')

	// Load wasm binary
	const wasm_bin = fs.readFileSync(wasm_path).buffer
	await oniguruma.loadWASM(wasm_bin)

	// Return oniguruma interface as required by vscode-textmate
	return {
		createOnigScanner(patterns: string[]) {
			return new oniguruma.OnigScanner(patterns)
		},
		createOnigString(s: string) {
			return new oniguruma.OnigString(s)
		},
	}
}
