import { StartupAnimation, type StartupPhase } from '@stoa-dev/kit/shell'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

const meta = {
	title: 'Shell/StartupAnimation',
	component: StartupAnimation,
	parameters: { layout: 'fullscreen' },
	args: {
		name: 'practicr',
		logo: '/stoa.svg',
		ready: false,
		phase: 'settings' satisfies StartupPhase,
		onComplete: fn(),
		settingsPaths: ['Sprache', 'Darstellung', 'Themenfarbe'],
	},
	argTypes: {
		phase: { control: 'inline-radio', options: ['license', 'settings', 'app'] },
	},
} satisfies Meta<typeof StartupAnimation>

export default meta
type Story = StoryObj<typeof meta>

/** Setting names flicker by while the settings load (loops in this story). */
export const LoadingSettings: Story = {}

export const CheckingLicense: Story = { args: { phase: 'license' } }

export const LoadingApp: Story = { args: { phase: 'app' } }

/** Deep paths like invoicer's: every field under its section. */
export const DeepSettingsPaths: Story = {
	args: {
		name: 'invoicer',
		settingsInterval: 60,
		settingsPaths: [
			'Einstellungen/Sprache',
			'Einstellungen/E-Mail/Server',
			'Einstellungen/E-Mail/Absender',
			'Einstellungen/Rechnungen/Nummernformat',
			'Einstellungen/Textbausteine/Einleitung',
		],
	},
}
