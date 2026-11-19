import { Input, Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { User } from 'lucide-react'
import { expect, userEvent, waitFor } from 'storybook/test'

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
export const Fancy: Story = { args: { transitionStyle: 'fancy' } }
export const WithSuggestions: Story = {
	args: { suggestions: ['Sonate in C-Dur', 'Sonate in a-Moll', 'Etüde Nr. 4'] },
	play: async ({ args, canvas }) => {
		const input = canvas.getByRole<HTMLInputElement>('combobox', {
			name: 'Titel',
		})
		await expect(
			Array.from(input.list?.options ?? [], ({ value }) => value),
		).toEqual(args.suggestions)
		await userEvent.type(input, 'Präludium')
		await expect(input).toHaveValue('Präludium')
	},
}
export const WithInlineLabelAndIcon: Story = {
	args: {
		label: 'Benutzername',
		placeholder: 'z. B. alex',
		icon: <User />,
	},
	render: (args) => (
		<div className='max-w-sm'>
			<Input {...args} />
		</div>
	),
	play: async ({ canvas, canvasElement }) => {
		const input = canvas.getByRole('textbox', { name: 'Benutzername' })
		const icon = canvasElement.querySelector('[data-slot="input-icon"] svg')
		await expect(icon).toBeVisible()
		const fieldRight = input.getBoundingClientRect().right
		const iconBounds = icon?.getBoundingClientRect()
		await expect(iconBounds?.right).toBeLessThan(fieldRight)
		await expect(iconBounds?.left).toBeGreaterThan(fieldRight - 40)
		await expect(input).toHaveAttribute('placeholder', 'Benutzername')
		await userEvent.click(input)
		await waitFor(() =>
			expect(input).toHaveAttribute('placeholder', 'z. B. alex'),
		)
		await expect(input).toHaveAccessibleName('Benutzername')
		await userEvent.type(input, 'alex')
		await userEvent.tab()
		await expect(input).toHaveValue('alex')
		await waitFor(() =>
			expect(input).toHaveAttribute('placeholder', 'Benutzername'),
		)
		await userEvent.clear(input)
		await userEvent.tab()
	},
}
export const Filled: Story = { args: { defaultValue: 'Etüde Nr. 4' } }
export const Invalid: Story = {
	args: { 'aria-invalid': true, defaultValue: 'K. 54x' },
}
export const Disabled: Story = {
	args: { disabled: true, defaultValue: 'Gesperrt' },
}
