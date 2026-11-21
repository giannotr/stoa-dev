import { SlideAction } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'

const meta = {
	title: 'UI/SlideAction',
	component: SlideAction,
	args: { onComplete: fn() },
} satisfies Meta<typeof SlideAction>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Compact: Story = { args: { height: 44 } }

export const Disabled: Story = { args: { disabled: true } }

export const ResetAfterSuccess: Story = { args: { resetAfterSuccess: true } }

export const KeyboardActivation: Story = {
	args: {
		label: 'Aktion bestätigen',
		successLabel: 'Bestätigt',
		onComplete: fn(),
	},
	play: async ({ args, canvas }) => {
		const thumb = canvas.getByRole('button', { name: 'Aktion bestätigen' })
		await userEvent.click(thumb)
		await expect(args.onComplete).not.toHaveBeenCalled()
		await userEvent.keyboard('{Enter}')
		await expect(canvas.getByRole('status')).toHaveTextContent('Bestätigt')
		await expect(thumb).toHaveAttribute('aria-disabled', 'true')
		await userEvent.keyboard(' ')
		await expect(args.onComplete).toHaveBeenCalledOnce()
	},
}
