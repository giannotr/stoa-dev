import { ConfirmDialog } from '@stoa-dev/kit/shell'
import { Button } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'

const meta = {
	title: 'Shell/ConfirmDialog',
	component: ConfirmDialog,
	args: {
		title: 'Rechnung löschen?',
		description: 'Die Rechnung RE-2026-042 wird endgültig entfernt.',
		confirmLabel: 'Löschen',
		variant: 'destructive',
		onConfirm: fn(),
		trigger: <Button variant='destructive'>Rechnung löschen</Button>,
	},
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Destructive: Story = {}

export const Neutral: Story = {
	args: {
		title: 'Änderungen übernehmen?',
		description: 'Die Vorlage wird für alle neuen Dokumente verwendet.',
		confirmLabel: 'Übernehmen',
		variant: 'default',
		trigger: <Button>Übernehmen</Button>,
	},
}

export const ConfirmCallsHandler: Story = {
	play: async ({ args, canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: 'Rechnung löschen' }),
		)
		const dialog = await screen.findByRole('dialog')
		await expect(dialog).toHaveTextContent('RE-2026-042')
		await userEvent.click(screen.getByRole('button', { name: 'Löschen' }))
		await expect(args.onConfirm).toHaveBeenCalledOnce()
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	},
}

export const CancelKeepsData: Story = {
	play: async ({ args, canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: 'Rechnung löschen' }),
		)
		await screen.findByRole('dialog')
		await userEvent.keyboard('{Escape}')
		await expect(args.onConfirm).not.toHaveBeenCalled()
	},
}
