import { TimeMeasured } from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

const meta = {
	title: 'Display/TimeMeasured',
	component: TimeMeasured,
	args: { hours: 1, minutes: 45 },
} satisfies Meta<typeof TimeMeasured>

export default meta
type Story = StoryObj<typeof meta>

export const HoursAndMinutes: Story = {}

/** `value` takes minutes directly. */
export const FromMinutes: Story = {
	args: { value: 105, hours: undefined, minutes: undefined },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('01:45')).toHaveAttribute(
			'datetime',
			'PT1H45M',
		)
	},
}

export const Small: Story = { args: { className: 'text-4xl' } }
