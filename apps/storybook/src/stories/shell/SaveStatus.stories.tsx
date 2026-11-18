import { SaveStatus } from '@stoa-dev/kit/shell'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'

const meta = {
	title: 'Shell/SaveStatus',
	component: SaveStatus,
	parameters: { layout: 'fullscreen' },
	decorators: [
		(Story) => (
			<div className='relative h-40'>
				<Story />
			</div>
		),
	],
	args: { status: 'saved', onRetry: fn() },
	argTypes: {
		status: {
			control: 'inline-radio',
			options: ['saving', 'saved', 'error', null],
		},
	},
} satisfies Meta<typeof SaveStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Saved: Story = {}
export const Saving: Story = { args: { status: 'saving' } }

export const ErrorWithRetry: Story = {
	args: { status: 'error' },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button'))
		await expect(args.onRetry).toHaveBeenCalledOnce()
	},
}

/** A custom message, e.g. a validation hint, replaces the status text. */
export const Message: Story = {
	args: { status: null, message: 'Bitte prüfe das Feld „E-Mail“.' },
}

export const Inline: Story = { args: { floating: false, status: 'saving' } }
