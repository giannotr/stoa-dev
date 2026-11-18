import { ValueFramed, ValuePaired, ValueSingle } from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'Display/Values',
	component: ValuePaired,
	args: { left: 'Mi', right: '18. November' },
} satisfies Meta<typeof ValuePaired>

export default meta
type Story = StoryObj<typeof meta>

export const Paired: Story = {}

export const Single: Story = {
	render: () => <ValueSingle value='2026' />,
}

export const Framed: Story = {
	render: () => <ValueFramed value='013' />,
}

/** Typical screen header: date left, year right, page index at the bottom. */
export const HeaderLine: Story = {
	render: (args) => (
		<div className='grid max-w-3xl gap-10'>
			<div className='flex items-center justify-between'>
				<ValuePaired {...args} />
				<ValueSingle value='2026' />
			</div>
			<ValueFramed value='013' />
		</div>
	),
}
