export type Ok<V> = {
	value: V
	error?: never
}

export type Err<E> = {
	error: E
	value?: never
}

export type Result<V, E = Error> = Ok<V> | Err<E>

export const ok = <V>(value: V): Ok<V> => ({ value })
export const err = <E>(error: E): Err<E> => ({ error })

export function unwrap<V, E extends Error>(result: Result<V, E>): V {
	if ('error' in result) {
		// biome-ignore lint: intended behavior
		throw result.error
	}

	return result.value
}
