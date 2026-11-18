import { Toggle } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bold, Italic, Underline } from 'lucide-react'

const meta = {
	title: 'UI/Toggle',
	component: Toggle,
	args: { 'aria-label': 'Fett', children: <Bold /> },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const On: Story = { args: { defaultPressed: true } }
export const WithText: Story = {
	args: { children: 'Metronom', 'aria-label': undefined },
}

export const Group: Story = {
	render: () => (
		<div className='flex gap-2'>
			<Toggle aria-label='Fett' defaultPressed>
				<Bold />
			</Toggle>
			<Toggle aria-label='Kursiv'>
				<Italic />
			</Toggle>
			<Toggle aria-label='Unterstrichen'>
				<Underline />
			</Toggle>
		</div>
	),
}
