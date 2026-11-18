import { NativeSelect } from '@stoa-dev/kit/shell'
import { Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'UI/NativeSelect',
	component: NativeSelect,
	render: (args) => (
		<div className='grid max-w-sm gap-2'>
			<Label htmlFor='native'>Schwierigkeit</Label>
			<NativeSelect id='native' defaultValue='2' {...args}>
				<option value='1'>Leicht</option>
				<option value='2'>Mittel</option>
				<option value='3'>Schwer</option>
			</NativeSelect>
		</div>
	),
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
