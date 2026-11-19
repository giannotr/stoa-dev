import { Pill } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tag } from 'lucide-react'

const meta = {
	title: 'UI/Pill',
	component: Pill,
	args: { children: 'In Arbeit' },
} satisfies Meta<typeof Pill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
	render: () => (
		<ul className='flex flex-wrap gap-2'>
			<Pill asChild>
				<li>In Arbeit</li>
			</Pill>
			<Pill asChild variant='accent'>
				<li>Technik</li>
			</Pill>
			<Pill asChild variant='outline'>
				<li>
					<Tag aria-hidden='true' /> Rhythmus
				</li>
			</Pill>
		</ul>
	),
}
