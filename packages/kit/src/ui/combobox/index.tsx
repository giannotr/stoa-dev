'use client'

import {
	type ComponentProps,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import { Input } from '../input'
import { Popover, PopoverAnchor, PopoverContent } from '../popover'

export type ComboboxOption =
	| string
	| {
			value: string
			/** Other names that also find this option, e.g. in other languages. */
			synonyms?: readonly string[]
			/** Quiet extra text after the value. */
			hint?: ReactNode
	  }

export type ComboboxMatch = {
	value: string
	hint?: ReactNode
	/** The synonym that matched, when the value itself did not. */
	via?: string
	/** Matched range in the value, for highlighting. */
	range?: [number, number]
}

export type ComboboxProps = Omit<
	ComponentProps<typeof Input>,
	'value' | 'onChange' | 'list' | 'suggestions'
> & {
	value: string
	onValueChange: (value: string) => void
	options: readonly ComboboxOption[]
	/** Replaces the default search (prefix, then contains, then synonyms). */
	match?: (options: readonly ComboboxOption[], query: string) => ComboboxMatch[]
	/** Upper bound of suggestions shown at once. */
	maxResults?: number
}

/** Case- and accent-insensitive key: "Flöte " → "flote". */
export function normalizeComboboxText(text: string) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, ' ')
}

function toOption(option: ComboboxOption) {
	return typeof option === 'string' ? { value: option } : option
}

/**
 * Default search: values starting with the query first, then values
 * containing it, then options found through a synonym. An empty query
 * returns every option.
 */
export function matchComboboxOptions(
	options: readonly ComboboxOption[],
	query: string,
): ComboboxMatch[] {
	const needle = normalizeComboboxText(query)
	const all = options.map(toOption)
	if (!needle) return all.map(({ value, hint }) => ({ value, hint }))
	const starts: ComboboxMatch[] = []
	const contains: ComboboxMatch[] = []
	const synonyms: ComboboxMatch[] = []
	for (const { value, hint, synonyms: names = [] } of all) {
		// Accent stripping keeps one character per letter here, so indices line up.
		const key = value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase()
		const at = key.indexOf(needle)
		if (at === 0) starts.push({ value, hint, range: [0, needle.length] })
		else if (at > 0)
			contains.push({ value, hint, range: [at, at + needle.length] })
		else {
			const via = names.find((name) =>
				normalizeComboboxText(name).includes(needle),
			)
			if (via) synonyms.push({ value, hint, via })
		}
	}
	return [...starts, ...contains, ...synonyms]
}

function Highlighted({
	value,
	range,
}: {
	value: string
	range?: [number, number]
}) {
	if (!range || value.normalize('NFD').length !== value.length)
		return <>{value}</>
	const [start, end] = range
	return (
		<>
			{value.slice(0, start)}
			<span
				data-slot='combobox-match'
				className='underline decoration-current/45 underline-offset-[3px]'
			>
				{value.slice(start, end)}
			</span>
			{value.slice(end)}
		</>
	)
}

/**
 * Free text field with a suggestion list. Unlike a native datalist the list
 * follows the kit style, finds options through synonyms ("Pianoforte" →
 * "Klavier") and says how it found them.
 */
export function Combobox({
	value,
	onValueChange,
	options,
	match = matchComboboxOptions,
	maxResults = 50,
	onKeyDown,
	onBlur,
	className,
	...props
}: ComboboxProps) {
	const { t } = useTranslation(STOA_NS)
	const listId = useId()
	const [open, setOpen] = useState(false)
	const [active, setActive] = useState(0)
	const input = useRef<HTMLInputElement>(null)
	const list = useRef<HTMLDivElement>(null)

	const matches = useMemo(
		() => match(options, value).slice(0, maxResults),
		[match, options, value, maxResults],
	)
	// Nothing to suggest once the field holds exactly the only match.
	const exact =
		matches.length === 1 &&
		normalizeComboboxText(matches[0].value) === normalizeComboboxText(value)
	const shown = open && matches.length > 0 && !exact
	const current = Math.min(active, Math.max(0, matches.length - 1))

	useEffect(() => {
		if (!shown) return
		list.current
			?.querySelector(`[data-index="${current}"]`)
			?.scrollIntoView({ block: 'nearest' })
	}, [current, shown])

	// Escape closes the list only. Dialogs listen on the document in the
	// capture phase, so the key is caught earlier, on the window.
	useEffect(() => {
		if (!shown) return
		function onEscape(event: globalThis.KeyboardEvent) {
			if (event.key !== 'Escape' || event.target !== input.current) return
			event.preventDefault()
			event.stopPropagation()
			setOpen(false)
		}
		window.addEventListener('keydown', onEscape, true)
		return () => window.removeEventListener('keydown', onEscape, true)
	}, [shown])

	function choose(index: number) {
		const chosen = matches[index]
		if (!chosen) return
		onValueChange(chosen.value)
		setOpen(false)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		onKeyDown?.(event)
		if (event.defaultPrevented) return
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			if (!shown) {
				setOpen(true)
				setActive(0)
				return
			}
			const step = event.key === 'ArrowDown' ? 1 : -1
			setActive((current + step + matches.length) % matches.length)
		} else if (event.key === 'Enter' && shown) {
			event.preventDefault()
			choose(current)
		}
	}

	const activeId = shown ? `${listId}-${current}` : undefined

	return (
		<Popover open={shown} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<div className='min-w-0'>
					<Input
						{...props}
						ref={input}
						role='combobox'
						autoComplete='off'
						aria-autocomplete='list'
						aria-expanded={shown}
						aria-controls={shown ? listId : undefined}
						aria-activedescendant={activeId}
						className={className}
						value={value}
						onChange={(event) => {
							onValueChange(event.target.value)
							setActive(0)
							setOpen(true)
						}}
						onClick={() => setOpen(true)}
						onKeyDown={handleKeyDown}
						onBlur={(event) => {
							setOpen(false)
							onBlur?.(event)
						}}
					/>
				</div>
			</PopoverAnchor>
			<PopoverContent
				data-slot='combobox-content'
				align='start'
				sideOffset={6}
				className='w-(--radix-popover-trigger-width) gap-0 p-1'
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
				onInteractOutside={(event) => {
					if (input.current?.contains(event.target as Node))
						event.preventDefault()
				}}
			>
				<div
					ref={list}
					id={listId}
					role='listbox'
					className='max-h-64 overflow-y-auto'
				>
					{matches.map(({ value: option, hint, via, range }, index) => (
						<div
							key={option}
							id={`${listId}-${index}`}
							data-index={index}
							data-slot='combobox-option'
							data-highlighted={index === current ? '' : undefined}
							role='option'
							aria-selected={index === current}
							tabIndex={-1}
							className={cn(
								'flex cursor-pointer items-baseline gap-2 rounded-md px-2.5 py-1.5 text-sm',
								index === current && 'bg-muted',
							)}
							// Choose on mouse down, so the focus stays in the input.
							onMouseDown={(event) => {
								event.preventDefault()
								choose(index)
							}}
							onMouseMove={() => setActive(index)}
						>
							<span className='font-medium'>
								<Highlighted value={option} range={range} />
							</span>
							{(via || hint) && (
								<span
									data-slot='combobox-hint'
									className='truncate text-xs text-muted-foreground'
								>
									{via ? t('combobox.via', { name: via }) : hint}
								</span>
							)}
						</div>
					))}
				</div>
			</PopoverContent>
		</Popover>
	)
}
