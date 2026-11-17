import { registerStoaLocales, supportedLanguages } from '@stoa-dev/kit/i18n'
import { TooltipProvider } from '@stoa-dev/kit/ui'
import type { Decorator, Preview } from '@storybook/react-vite'
import i18next from 'i18next'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { MemoryRouter } from 'react-router'
import { installTauriMock, type TauriMock } from './tauri-mock'
import './storybook.css'

void i18next.use(initReactI18next).init({
	lng: 'de',
	fallbackLng: 'de',
	resources: {},
	interpolation: { escapeValue: false },
})
registerStoaLocales(i18next)

/** Accent colours of the apps, so components can be checked in every brand. */
const accents = {
	stoa: '#0093af',
	practicr: '#0070FF',
	bookcollectr: '#E23F5A',
	invoicer: '#43AEC5',
} as const

const withApp: Decorator = (Story, { globals, parameters }) => {
	const theme = globals.theme === 'dark' ? 'dark' : 'light'
	const accent = accents[globals.accent as keyof typeof accents] ?? accents.stoa
	const instrument = globals.design === 'instrument'

	useEffect(() => {
		void i18next.changeLanguage(globals.locale)
	}, [globals.locale])

	useEffect(() => {
		document.documentElement.style.setProperty('--stoa-accent', accent)
	}, [accent])

	useEffect(() => {
		document.documentElement.classList.toggle('stoa-instrument', instrument)
	}, [instrument])

	return (
		<I18nextProvider i18n={i18next}>
			<ThemeProvider attribute='class' forcedTheme={theme}>
				<MemoryRouter initialEntries={[parameters.route ?? '/']}>
					<TooltipProvider>
						<div className='min-h-24 p-6 text-foreground'>
							<Story />
						</div>
					</TooltipProvider>
				</MemoryRouter>
			</ThemeProvider>
		</I18nextProvider>
	)
}

const preview: Preview = {
	decorators: [withApp],
	// Every story gets a fresh fake backend; set `parameters.tauri` to change it.
	beforeEach: ({ parameters }) =>
		installTauriMock(parameters.tauri as TauriMock | undefined),
	parameters: {
		layout: 'fullscreen',
		controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
	},
	globalTypes: {
		design: {
			description: 'Gestaltung',
			toolbar: {
				title: 'Design',
				icon: 'component',
				items: [
					{ value: 'classic', title: 'Classic' },
					{ value: 'instrument', title: 'Instrument (experimentell)' },
				],
				dynamicTitle: true,
			},
		},
		theme: {
			description: 'Farbschema',
			toolbar: {
				title: 'Theme',
				icon: 'mirror',
				items: [
					{ value: 'light', title: 'Hell' },
					{ value: 'dark', title: 'Dunkel' },
				],
				dynamicTitle: true,
			},
		},
		locale: {
			description: 'Sprache',
			toolbar: {
				title: 'Sprache',
				icon: 'globe',
				items: supportedLanguages.map(({ value, label }) => ({
					value,
					title: label,
				})),
				dynamicTitle: true,
			},
		},
		accent: {
			description: 'Akzentfarbe der App',
			toolbar: {
				title: 'Akzent',
				icon: 'paintbrush',
				items: Object.keys(accents).map((value) => ({ value, title: value })),
				dynamicTitle: true,
			},
		},
	},
	initialGlobals: {
		design: 'instrument',
		theme: 'light',
		locale: 'de',
		accent: 'stoa',
	},
}

export default preview
