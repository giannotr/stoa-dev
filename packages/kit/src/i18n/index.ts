import type { i18n as I18n } from 'i18next'
import at from './locales/at.json'
import de from './locales/de.json'
import en from './locales/en.json'
import it from './locales/it.json'
import { STOA_NS } from './namespace'

export { STOA_NS }

export const stoaResources = {
	de,
	en,
	'de-AT': at,
	it,
} as const

export const supportedLanguages = [
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'de-AT', label: 'Österreichisch' },
	{ value: 'it', label: 'Italiano' },
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['value']

/**
 * Adds the @stoa/kit strings as the `stoa` namespace. Call once after `i18next.init()`.
 * App strings keep living in the app's own `translation` namespace.
 * Pass `overrides` to adjust single strings per app without forking the bundle.
 */
export function registerStoaLocales(
	i18n: I18n,
	overrides: Partial<Record<SupportedLanguage, Record<string, unknown>>> = {},
) {
	for (const [language, bundle] of Object.entries(stoaResources)) {
		i18n.addResourceBundle(language, STOA_NS, bundle, true, false)
		const override = overrides[language as SupportedLanguage]
		if (override)
			i18n.addResourceBundle(language, STOA_NS, override, true, true)
	}
}
