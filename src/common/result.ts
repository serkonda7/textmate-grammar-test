export { type Ok, type Err, type Result, ok, err, unwrap }

type Ok<V> = {
	value: V
	error?: never
}

type Err<E> = {
	error: E
	value?: never
}

type Result<V, E = Error> = Ok<V> | Err<E>

const ok = <V>(value: V): Ok<V> => ({ value })
const err = <E>(error: E): Err<E> => ({ error })

function unwrap<V, E extends Error>(result: Result<V, E>): V {
	if ('error' in result) {
		// biome-ignore lint: intended behavior
		throw result.error
	}

	return result.value
}
