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

export { ok, err, type Result }
