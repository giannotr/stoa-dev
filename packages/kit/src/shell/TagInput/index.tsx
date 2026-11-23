import { X } from 'lucide-react'
import { type KeyboardEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'

export interface TagInputProps {
	id?: string
	value: string[]
	onChange: (tags: string[]) => void
	/** Existing tags offered as suggestions. */
	suggestions?: string[]
	disabled?: boolean
	placeholder?: string
	/** Shown before each tag, e.g. `#`. */
	prefix?: string
	className?: string
}

/** Trims, collapses whitespace and drops empty or case-insensitive duplicates. */
export function normalizeTags(value: readonly string[]) {
	const seen = new Set<string>()
	const tags: string[] = []
	for (const item of value) {
		const tag = item.trim().replace(/\s+/g, ' ')
		const key = tag.toLocaleLowerCase()
		if (!tag || seen.has(key)) continue
		seen.add(key)
		tags.push(tag)
	}
	return tags
}

/**
 * Free-form tag list: Enter, comma or Tab adds the typed tag, Backspace in the
 * empty field removes the last one; suggestions come from a datalist.
 */
export function TagInput({
	id,
	value,
	onChange,
	suggestions = [],
	disabled,
	placeholder,
	prefix = '#',
	className,
}: TagInputProps) {
	const { t } = useTranslation(STOA_NS)
	const listId = useId()
	const [text, setText] = useState('')
	const add = (raw: string) => {
		const next = normalizeTags([...value, ...raw.split(',')])
		if (next.length !== value.length) onChange(next)
		setText('')
	}
	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		// Enter never submits the surrounding form from here.
		if (event.key === 'Enter') event.preventDefault()
		if (
			(event.key === 'Enter' || event.key === ',' || event.key === 'Tab') &&
			text.trim()
		) {
			event.preventDefault()
			add(text)
		} else if (event.key === 'Backspace' && !text && value.length) {
			onChange(value.slice(0, -1))
		}
	}
	const offered = suggestions.filter(
		(tag) =>
			!value.some(
				(item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase(),
			),
	)
	return (
		<div
			data-slot='tag-input'
			className={cn(
				'flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background/70 px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:opacity-60',
				className,
			)}
		>
			{value.map((tag) => (
				<span
					key={tag}
					data-slot='tag-input-tag'
					className='inline-flex items-center gap-1 rounded-full bg-(--accent-wash) py-0.5 pr-1 pl-2.5 text-xs font-medium'
				>
					{prefix}
					{tag}
					{!disabled && (
						<button
							type='button'
							className='grid size-4 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50'
							aria-label={t('tags.remove', { tag })}
							onClick={() => onChange(value.filter((item) => item !== tag))}
						>
							<X className='size-3' />
						</button>
					)}
				</span>
			))}
			<input
				id={id}
				list={offered.length ? listId : undefined}
				className='min-w-32 flex-1 bg-transparent px-1 py-1 text-sm font-semibold outline-none placeholder:text-muted-foreground'
				placeholder={value.length ? '' : (placeholder ?? t('tags.placeholder'))}
				value={text}
				disabled={disabled}
				onChange={(e) => {
					// Picking a suggestion from the datalist adds it right away.
					if (offered.includes(e.target.value)) add(e.target.value)
					else setText(e.target.value)
				}}
				onKeyDown={onKeyDown}
				onBlur={() => text.trim() && add(text)}
			/>
			{offered.length > 0 && (
				<datalist id={listId}>
					{offered.map((tag) => (
						<option key={tag} value={tag} />
					))}
				</datalist>
			)}
		</div>
	)
}
