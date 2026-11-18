import { BarChart, BarChartItem } from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'

const week = [
	['Mo', 23],
	['Di', 17],
	['Mi', 19],
	['Do', 21],
	['Fr', 24],
	['Sa', 12],
	['So', 9],
] as const

const meta = {
	title: 'Display/BarChart',
	component: BarChart,
	args: { label: 'Minuten pro Tag', children: null },
	render: (args) => (
		<div className='max-w-2xl'>
			<BarChart {...args}>
				{week.map(([label, value]) => (
					<BarChartItem key={label} label={label} value={value} />
				))}
			</BarChart>
		</div>
	),
} satisfies Meta<typeof BarChart>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {}

export const Horizontal: Story = { args: { variant: 'horizontal' } }

/** A fixed scale keeps several charts comparable. */
export const FixedScale: Story = { args: { max: 60 } }
