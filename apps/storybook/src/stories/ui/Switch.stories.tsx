import { Label, Switch } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'

const meta = {
	title: 'UI/Switch',
	component: Switch,
	args: { id: 'switch' },
	render: (args) => (
		<div className='flex items-center gap-3'>
			<Switch {...args} />
			<Label htmlFor={args.id}>Im Repertoire</Label>
		</div>
	),
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}
export const On: Story = { args: { defaultChecked: true } }
export const Disabled: Story = {
	args: { disabled: true, defaultChecked: true },
}

export const Sizes: Story = {
	render: () => (
		<div className='flex items-center gap-4'>
			<Switch size='sm' aria-label='Klein' defaultChecked />
			<Switch aria-label='Standard' defaultChecked />
			<Switch size='lg' aria-label='Groß' defaultChecked />
			<Switch size='sm' aria-label='Klein aus' />
			<Switch aria-label='Standard aus' />
			<Switch size='lg' aria-label='Groß aus' />
		</div>
	),
}

export const Toggle: Story = {
	play: async ({ canvas }) => {
		const control = canvas.getByRole('switch')
		await userEvent.click(control)
		await expect(control).toBeChecked()
	},
}
