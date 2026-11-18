import {
	Label,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent } from 'storybook/test'

const meta = {
	title: 'UI/Select',
	component: Select,
	render: (args) => (
		<div className='grid max-w-sm gap-2'>
			<Label>Epoche</Label>
			<Select defaultValue='classic' {...args}>
				<SelectTrigger className='w-full' aria-label='Epoche'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Epochen</SelectLabel>
						<SelectItem value='baroque'>Barock</SelectItem>
						<SelectItem value='classic'>Klassik</SelectItem>
						<SelectItem value='romantic'>Romantik</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ChooseOption: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('combobox', { name: 'Epoche' }))
		await userEvent.click(
			await screen.findByRole('option', { name: 'Romantik' }),
		)
		await expect(
			canvas.getByRole('combobox', { name: 'Epoche' }),
		).toHaveTextContent('Romantik')
	},
}
