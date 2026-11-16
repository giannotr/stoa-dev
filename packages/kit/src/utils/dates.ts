import i18next from 'i18next'

export function getRuntimeLocale() {
	return i18next.resolvedLanguage ?? navigator.language ?? 'de'
}

export function isValidDate(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(value.getTime())
}

export function formatDate(
	value: Date | undefined,
	options?: { locale?: string },
) {
	return isValidDate(value)
		? new Intl.DateTimeFormat(options?.locale ?? getRuntimeLocale(), {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			}).format(value)
		: ''
}

export function formatTimestamp(value: string, options?: { locale?: string }) {
	const date = new Date(value)
	return isValidDate(date)
		? new Intl.DateTimeFormat(options?.locale ?? getRuntimeLocale(), {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(date)
		: ''
}
