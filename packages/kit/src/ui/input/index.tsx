import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react'

import { cn } from '../../utils/cn'

type InputProps = ComponentProps<'input'> & {
	/** Accessible field name shown inside the empty input until focus. */
	label?: string
	/** Decorative icon shown inside the right edge of the input. */
	icon?: ReactNode
	/** Transition used for hover and focus. */
	transitionStyle?: 'default' | 'fancy'
	/** Suggested values offered by the native input picker. */
	suggestions?: readonly string[]
}

function Input({
	className,
	type,
	label,
	icon,
	transitionStyle = 'default',
	suggestions,
	list,
	placeholder,
	'aria-label': ariaLabel,
	onFocus,
	onBlur,
	...props
}: InputProps) {
	const suggestionsId = useId()
	const hasSuggestions = list === undefined && Boolean(suggestions?.length)
	const [inlineText, setInlineText] = useState({
		focused: false,
		showingPlaceholder: false,
	})
	const swapTimer = useRef<number | undefined>(undefined)

	useEffect(() => () => window.clearTimeout(swapTimer.current), [])

	function updateInlineText(focused: boolean) {
		window.clearTimeout(swapTimer.current)
		const { showingPlaceholder } = inlineText
		if (
			!label ||
			!placeholder ||
			focused === showingPlaceholder ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			setInlineText({ focused, showingPlaceholder: focused })
			return
		}

		setInlineText({ focused, showingPlaceholder })
		// Leave enough time for the outgoing text to fade before swapping it.
		swapTimer.current = window.setTimeout(() => {
			setInlineText({ focused, showingPlaceholder: focused })
		}, 90)
	}

	const hideInlineText =
		label &&
		(placeholder
			? inlineText.focused !== inlineText.showingPlaceholder
			: inlineText.focused)

	const showsHint = !label || (inlineText.showingPlaceholder && placeholder)

	const input = (
		<input
			type={type}
			list={hasSuggestions ? suggestionsId : list}
			data-slot='input'
			data-transition-style={transitionStyle}
			data-has-icon={icon ? '' : undefined}
			data-inline-label={
				label ? (hideInlineText ? 'hidden' : 'visible') : undefined
			}
			// The placeholder carries either a hint (grey) or the inline label (dark).
			data-placeholder-role={showsHint ? 'hint' : 'label'}
			className={cn(
				'h-12 w-full min-w-0 rounded-lg border-[1.5px] border-foreground/35 bg-transparent px-3 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:font-semibold placeholder:text-muted-foreground data-[placeholder-role=label]:placeholder:text-foreground/75 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				icon && 'peer pr-10',
				className,
			)}
			aria-label={ariaLabel ?? label}
			placeholder={
				inlineText.showingPlaceholder && placeholder
					? placeholder
					: label || placeholder
			}
			onFocus={(event) => {
				updateInlineText(true)
				onFocus?.(event)
			}}
			onBlur={(event) => {
				updateInlineText(false)
				onBlur?.(event)
			}}
			{...props}
		/>
	)

	const field = icon ? (
		<div className='flex min-w-0 items-center'>
			{input}
			<span
				aria-hidden='true'
				data-slot='input-icon'
				className='pointer-events-none -ml-10 flex w-10 shrink-0 items-center justify-center text-foreground/75 peer-disabled:opacity-50 [&>svg]:size-[1.125rem]'
			>
				{icon}
			</span>
		</div>
	) : (
		input
	)

	return (
		<>
			{field}
			{hasSuggestions && (
				<datalist id={suggestionsId}>
					{Array.from(new Set(suggestions), (value) => (
						<option key={value} value={value} />
					))}
				</datalist>
			)}
		</>
	)
}

export { Input, type InputProps }
