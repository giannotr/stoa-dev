import { Label, Textarea } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'UI/Textarea',
	component: Textarea,
	args: { placeholder: 'Fingersätze, Tempo, …' },
	render: (args) => (
		<div className='grid max-w-md gap-2'>
			<Label htmlFor='notes'>Notizen</Label>
			<Textarea id='notes' {...args} />
		</div>
	),
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
