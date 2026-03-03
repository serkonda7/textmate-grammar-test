const DEFAULT_TAB_SIZE = 4

export function raw_index_to_visual_column(
	line: string,
	raw_index: number,
	tab_size: number = DEFAULT_TAB_SIZE,
): number {
	let column = 0

	for (let i = 0; i < raw_index; i++) {
		if (line[i] === '\t') {
			column += tab_size - (column % tab_size)
		} else {
			column++
		}
	}

	return column
}

export function visual_column_to_raw_index(
	line: string,
	visual_column: number,
	tab_size: number = DEFAULT_TAB_SIZE,
): number {
	if (visual_column <= 0) {
		return 0
	}

	let column = 0

	for (let i = 0; i < line.length; i++) {
		const width = line[i] === '\t' ? tab_size - (column % tab_size) : 1
		const next_column = column + width

		if (visual_column < next_column) {
			return i
		}

		if (visual_column === next_column) {
			return i + 1
		}

		column = next_column
	}

	return line.length
}
