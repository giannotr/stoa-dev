import { de, deAT, enUS, it } from 'date-fns/locale'
import { CalendarIcon, Target } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { Calendar } from '../../ui/calendar'
import { Field, FieldLabel } from '../../ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '../../ui/input-group'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { formatDate, getRuntimeLocale, isValidDate } from '../../utils/dates'

type DatePickerInputProps = {
	id: string
	label: string
	hideLabel?: boolean
	value: string
	onChange: (value: string) => void
	invalid?: boolean
	required?: boolean
	disabled?: boolean
	/** First month reachable in the calendar. Defaults to January, 100 years ago. */
	startMonth?: Date
	/** Last month reachable in the calendar. Defaults to December, 10 years ahead. */
	endMonth?: Date
}

const YEARS_BACK = 100
const YEARS_AHEAD = 10

function parseDateValue(value: string) {
	return parseTypedDateValue(value)
}

function createDateIfValid(year: number, month: number, day: number) {
	const date = new Date(year, month - 1, day)

	if (
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
	) {
		return date
	}

	return undefined
}

function normalizeTextValue(value: string) {
	return value
		.trim()
		.toLocaleLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
}

function tokenizeDateText(value: string) {
	return normalizeTextValue(value).match(/[a-z0-9]+/g) ?? []
}

function parseLocaleDateValue(value: string) {
	const dateParts = new Intl.DateTimeFormat(getRuntimeLocale(), {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	}).formatToParts(new Date(2026, 4, 11))
	const partOrder = dateParts
		.filter(
			(part) =>
				part.type === 'day' || part.type === 'month' || part.type === 'year',
		)
		.map((part) => part.type)
	const normalizedParts = tokenizeDateText(value)

	if (normalizedParts.length !== partOrder.length) {
		return undefined
	}

	const monthNames = new Map<string, number>()

	for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
		const monthDate = new Date(2026, monthIndex, 1)
		const longMonth = new Intl.DateTimeFormat(getRuntimeLocale(), {
			month: 'long',
		}).format(monthDate)
		const shortMonth = new Intl.DateTimeFormat(getRuntimeLocale(), {
			month: 'short',
		}).format(monthDate)

		monthNames.set(normalizeTextValue(longMonth), monthIndex + 1)
		monthNames.set(normalizeTextValue(shortMonth), monthIndex + 1)
	}

	let day: number | undefined
	let month: number | undefined
	let year: number | undefined

	partOrder.forEach((partType, index) => {
		const partValue = normalizedParts[index]

		if (partType === 'day') {
			day = Number(partValue)
		}

		if (partType === 'month') {
			month = monthNames.get(partValue) ?? Number(partValue)
		}

		if (partType === 'year') {
			year = Number(partValue)
		}
	})

	if (!day || !month || !year) {
		return undefined
	}

	return createDateIfValid(year, month, day)
}

function parseTypedDateValue(value: string) {
	const trimmedValue = value.trim()

	if (!trimmedValue) {
		return undefined
	}

	const isoDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

	if (isoDateMatch) {
		const [, yearValue, monthValue, dayValue] = isoDateMatch
		const year = Number(yearValue)
		const month = Number(monthValue)
		const day = Number(dayValue)

		return createDateIfValid(year, month, day)
	}

	const numericDateMatch = trimmedValue.match(
		/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
	)

	if (numericDateMatch) {
		const [, dayValue, monthValue, yearValue] = numericDateMatch
		const year = Number(yearValue)
		const month = Number(monthValue)
		const day = Number(dayValue)

		return createDateIfValid(year, month, day)
	}

	if (!/\d{4}/.test(trimmedValue)) {
		return undefined
	}

	const localeDate = parseLocaleDateValue(trimmedValue)

	if (isValidDate(localeDate)) {
		return localeDate
	}

	const date = new Date(trimmedValue)

	return isValidDate(date) ? date : undefined
}

function toDateValue(date: Date | undefined) {
	if (!date) {
		return ''
	}

	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

export function DatePickerInput({
	id,
	label,
	hideLabel = false,
	value,
	onChange,
	invalid = false,
	required = false,
	disabled = false,
	startMonth,
	endMonth,
}: DatePickerInputProps) {
	const currentYear = new Date().getFullYear()
	const firstMonth = startMonth ?? new Date(currentYear - YEARS_BACK, 0, 1)
	const lastMonth = endMonth ?? new Date(currentYear + YEARS_AHEAD, 11, 1)
	const { t, i18n } = useTranslation(STOA_NS)
	const language = i18n.resolvedLanguage ?? 'de'
	const calendarLocales = { de, 'de-AT': deAT, en: enUS, it }
	const calendarLocale =
		calendarLocales[language as keyof typeof calendarLocales] ?? de
	const [open, setOpen] = React.useState(false)
	const [date, setDate] = React.useState<Date | undefined>(() =>
		parseDateValue(value),
	)
	const [month, setMonth] = React.useState<Date | undefined>(date)
	const [inputValue, setInputValue] = React.useState(formatDate(date) || value)

	React.useEffect(() => {
		if (disabled) setOpen(false)
	}, [disabled])

	const updateValue = (nextValue: string) => {
		if (nextValue !== value) onChange(nextValue)
	}

	const handleSetToday = () => {
		if (disabled) return
		const today = new Date()
		setDate(today)
		setMonth(today)
		setInputValue(formatDate(today))
		updateValue(toDateValue(today))
		setOpen(false)
	}

	const commitInputValue = (valueToCommit: string) => {
		if (disabled) return
		if (!valueToCommit.trim()) {
			setDate(undefined)
			setMonth(undefined)
			setInputValue('')
			updateValue('')
			return
		}

		const nextDate = parseTypedDateValue(valueToCommit)

		if (!isValidDate(nextDate)) {
			return
		}

		setDate(nextDate)
		setMonth(nextDate)
		setInputValue(formatDate(nextDate))
		updateValue(toDateValue(nextDate))
	}

	React.useEffect(() => {
		const nextDate = parseDateValue(value)

		setDate(nextDate)
		setMonth(nextDate)
		setInputValue(formatDate(nextDate, { locale: language }) || value)
	}, [value, language])

	return (
		<Field className='w-full'>
			{!hideLabel && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<InputGroup aria-invalid={invalid}>
				<InputGroupInput
					id={id}
					aria-label={hideLabel ? label : undefined}
					aria-invalid={invalid}
					value={inputValue}
					// placeholder={formatDate(new Date())}
					placeholder={undefined}
					required={required}
					disabled={disabled}
					onChange={(e) => {
						const nextInputValue = e.target.value
						setInputValue(nextInputValue)
						commitInputValue(nextInputValue)
					}}
					onBlur={() => {
						commitInputValue(inputValue)
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault()
							commitInputValue(inputValue)
							setOpen(false)
						}

						if (e.key === 'ArrowDown') {
							e.preventDefault()
							setOpen(true)
						}
					}}
				/>
				<InputGroupAddon align='inline-end'>
					<Popover open={open && !disabled} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<InputGroupButton
								id={`${id}-picker`}
								disabled={disabled}
								variant='ghost'
								size='icon-xs'
								aria-label={t('datePicker.selectDate')}
							>
								<CalendarIcon />
								<span className='sr-only'>{t('datePicker.selectDate')}</span>
							</InputGroupButton>
						</PopoverTrigger>
						<PopoverContent
							className='w-auto overflow-hidden p-0'
							align='end'
							alignOffset={-8}
							sideOffset={10}
						>
							<div className='flex items-center justify-center px-1 py-2 mb-1 border-b'>
								<Button
									type='button'
									variant='ghost'
									size='sm'
									onClick={handleSetToday}
									disabled={disabled}
									className='w-fit'
								>
									<Target /> {t('datePicker.today')}
								</Button>
							</div>

							<Calendar
								mode='single'
								captionLayout='dropdown'
								// Always six week rows: the popover keeps its height, so the
								// month chevrons never jump away from the pointer.
								fixedWeeks
								startMonth={firstMonth}
								endMonth={lastMonth}
								disabled={disabled}
								locale={calendarLocale}
								labels={{
									labelNext: () => t('datePicker.nextMonth'),
									labelPrevious: () => t('datePicker.previousMonth'),
									labelMonthDropdown: () => t('datePicker.chooseMonth'),
									labelYearDropdown: () => t('datePicker.chooseYear'),
									labelNav: () => t('datePicker.navigation'),
									labelDayButton: (day, modifiers) =>
										[
											modifiers.today ? t('datePicker.today') : '',
											new Intl.DateTimeFormat(language, {
												dateStyle: 'full',
											}).format(day),
											modifiers.selected ? t('datePicker.selected') : '',
										]
											.filter(Boolean)
											.join(', '),
								}}
								selected={date}
								month={month}
								onMonthChange={setMonth}
								onSelect={(date) => {
									if (disabled) return
									setDate(date)
									setInputValue(formatDate(date))
									updateValue(toDateValue(date))
									setOpen(false)
								}}
							/>
						</PopoverContent>
					</Popover>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	)
}
