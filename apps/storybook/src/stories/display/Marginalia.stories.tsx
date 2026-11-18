import {
	Marginalia,
	MarginaliaFramed,
	MarginaliaPair,
} from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * Marginalia: quiet annotations at the edges of a screen — date, year,
 * page index — as in printed margins.
 */
const meta = {
	title: 'Display/Marginalia',
	component: MarginaliaPair,
	args: { left: 'Mi', right: '18. November' },
} satisfies Meta<typeof MarginaliaPair>

export default meta
type Story = StoryObj<typeof meta>

export const Paired: Story = {}

export const Single: Story = {
	render: () => <Marginalia value='2026' />,
}

export const Framed: Story = {
	render: () => <MarginaliaFramed value='013' />,
}

/** Typical screen header: date left, year right, page index at the bottom. */
export const HeaderLine: Story = {
	render: (args) => (
		<div className='grid max-w-3xl gap-10'>
			<div className='flex items-center justify-between'>
				<MarginaliaPair {...args} />
				<Marginalia value='2026' />
			</div>
			<MarginaliaFramed value='013' />
		</div>
	),
}
