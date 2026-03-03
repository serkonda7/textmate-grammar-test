import { err, ok } from '@serkonda7/ts-result'

const ERR_TAB_INDENTATION = 'Tabs are not supported for indentation. Use spaces instead'

export function err_tab_indent(line: string, line_nr: number) {
	if (line[0] === '\t') {
		return err(new SyntaxError(`${ERR_TAB_INDENTATION} (line ${line_nr})`))
	}

	return ok(null)
}
