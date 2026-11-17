import {
	LicenseActivation,
	LicenseCard,
	LicenseProvider,
	LicenseStatusBanner,
} from '@stoa-dev/kit/licensing'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { licenseState, type TauriMock } from '../../../.storybook/tauri-mock'

/**
 * The licensing UI talks to the Rust backend via Tauri commands. Each story fakes
 * those commands through `parameters.tauri` (see `.storybook/tauri-mock.ts`).
 */
const meta = {
	title: 'Licensing/LicenseCard',
	component: LicenseCard,
	decorators: [
		(Story) => (
			<LicenseProvider>
				<div className='grid max-w-2xl gap-6'>
					<LicenseStatusBanner />
					<Story />
				</div>
			</LicenseProvider>
		),
	],
} satisfies Meta<typeof LicenseCard>

export default meta
type Story = StoryObj<typeof meta>

const tauri = (mock: TauriMock) => ({ tauri: mock })

export const Active: Story = {
	parameters: tauri({ license: licenseState('active') }),
}

export const OfflineGrace: Story = {
	parameters: tauri({ license: licenseState('offline_grace') }),
}

export const Expired: Story = {
	parameters: tauri({
		license: licenseState('expired', {
			expiresAt: Math.floor(Date.now() / 1000) - 86_400,
		}),
	}),
}

export const DeviceRevoked: Story = {
	parameters: tauri({ license: licenseState('revoked') }),
}

export const LicenseRevoked: Story = {
	parameters: tauri({ license: licenseState('license_revoked') }),
}

export const Unactivated: Story = {
	parameters: tauri({ license: licenseState('unactivated') }),
}

export const ActivationForm: Story = {
	parameters: tauri({ license: licenseState('unactivated') }),
	render: () => <LicenseActivation onActivated={fn()} />,
}

/** A failing activation shows the translated error instead of the raw code. */
export const ActivationNetworkError: Story = {
	parameters: tauri({
		license: licenseState('unactivated'),
		activationError: 'NETWORK',
	}),
	render: () => <LicenseActivation onActivated={fn()} />,
	play: async ({ canvas }) => {
		const inputs = canvas.getAllByRole('textbox')
		await userEvent.type(inputs[0], 'STOA-TEST-CODE')
		if (inputs[1]) await userEvent.type(inputs[1], 'Storybook')
		await userEvent.click(canvas.getByRole('button', { name: /aktivieren/i }))
		await waitFor(() => expect(canvas.getByRole('alert')).toBeVisible())
	},
}
