import { type ComponentProps, useState } from 'react'
import { Input } from '../../ui/input'

export type FieldFeedback = 'required' | 'warning' | 'error' | undefined

/**
 * How loudly a field problem is shown: quietly before the first blur,
 * as a warning once touched, as an error after a submit attempt.
 */
export function fieldFeedback(
	problem: boolean,
	touched: boolean,
	submitted: boolean,
): FieldFeedback {
	if (!problem) return undefined
	return submitted ? 'error' : touched ? 'warning' : 'required'
}

export type ValidatedInputProps = ComponentProps<typeof Input> & {
	/** The current value is invalid or missing. */
	problem: boolean
	/** A submit was attempted; problems are shown as errors. */
	submitted?: boolean
}

/** Input that only flags a problem once the user has left the field. */
export function ValidatedInput({
	problem,
	submitted = false,
	onBlur,
	...props
}: ValidatedInputProps) {
	const [touched, setTouched] = useState(false)
	const state = fieldFeedback(problem, touched, submitted)
	return (
		<Input
			{...props}
			data-field-state={state}
			aria-invalid={state === 'warning' || state === 'error'}
			onBlur={(event) => {
				setTouched(true)
				onBlur?.(event)
			}}
		/>
	)
}
