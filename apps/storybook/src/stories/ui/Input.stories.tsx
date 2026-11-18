import { Input, Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'UI/Input',
	component: Input,
	args: { placeholder: 'z. B. Sonate in C-Dur' },
	render: (args) => (
		<div className='grid max-w-sm gap-2'>
			<Label htmlFor='input'>Titel</Label>
			<Input id='input' {...args} />
		</div>
	),
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Filled: Story = { args: { defaultValue: 'Etüde Nr. 4' } }
export const Invalid: Story = {
	args: { 'aria-invalid': true, defaultValue: 'K. 54x' },
}
export const Disabled: Story = {
	args: { disabled: true, defaultValue: 'Gesperrt' },
}
