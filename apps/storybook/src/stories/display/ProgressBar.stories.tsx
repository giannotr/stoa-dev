import { ProgressBar } from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

const meta = {
	title: 'Display/ProgressBar',
	component: ProgressBar,
	decorators: [
		(Story) => (
			<div className='max-w-sm'>
				<Story />
			</div>
		),
	],
	args: { label: 'Ziel 02:00', progress: 0.87 },
} satisfies Meta<typeof ProgressBar>

export default meta
type Story = StoryObj<typeof meta>

/** Share only: the percentage is shown on the right. */
export const Percentage: Story = {}

/** Count on the right, share given separately. */
export const ValueAndProgress: Story = {
	args: { label: 'In Arbeit', value: 12, progress: 0.6 },
}

/** Share computed from value / total. */
export const ValueOfTotal: Story = {
	args: { label: 'Geplant', value: 7, total: 21, progress: undefined },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			'33',
		)
	},
}

export const Completed: Story = {
	args: { label: 'Abgeschlossen', completed: true, progress: undefined },
}

/** Full bar and still a count on the right, e.g. finished pieces. */
export const CompletedWithValue: Story = {
	args: {
		label: 'Abgeschlossen',
		value: 31,
		completed: true,
		progress: undefined,
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('progressbar')).toHaveAttribute(
			'aria-valuenow',
			'100',
		)
		await expect(canvas.getByText('31')).toBeVisible()
	},
}

export const Group: Story = {
	render: () => (
		<div className='grid gap-4'>
			<ProgressBar label='In Arbeit' value={12} progress={0.6} />
			<ProgressBar label='Geplant' value={7} total={21} />
			<ProgressBar label='Abgeschlossen' value={31} completed />
		</div>
	),
}
