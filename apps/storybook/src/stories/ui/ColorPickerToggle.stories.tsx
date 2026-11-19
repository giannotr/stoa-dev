import { ColorPickerToggle } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

const meta = {
	title: 'UI/ColorPickerToggle',
	component: ColorPickerToggle,
	args: { defaultValue: '#ABC', onChange: fn() },
	globals: { locale: 'en' },
} satisfies Meta<typeof ColorPickerToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Interactive: Story = {
	play: async ({ args, canvas }) => {
		const trigger = canvas.getByRole('button', {
			name: 'Choose color: #AABBCC',
		})
		await userEvent.tab()
		await expect(trigger).toHaveFocus()
		await userEvent.keyboard('{Enter}')

		const dialog = await screen.findByRole('dialog', {
			name: 'Color instrument',
		})
		const picker = within(dialog)
		await expect(trigger).toHaveAttribute('aria-expanded', 'true')
		await userEvent.click(
			picker.getByRole('button', { name: 'Select #0070FF' }),
		)
		await expect(args.onChange).toHaveBeenLastCalledWith('#0070FF')
		await expect(trigger).toHaveAccessibleName('Choose color: #0070FF')

		await userEvent.keyboard('{Escape}')
		await expect(trigger).toHaveAttribute('aria-expanded', 'false')
		await waitFor(() => expect(trigger).toHaveFocus())

		await userEvent.click(trigger)
		await expect(
			screen.getByRole('textbox', { name: 'Hex color' }),
		).toHaveValue('#0070FF')
	},
}

export const Disabled: Story = {
	args: { disabled: true },
}
