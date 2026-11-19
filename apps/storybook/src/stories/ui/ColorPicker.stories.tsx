import { ColorPicker, type ColorPickerProps } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fireEvent, fn, userEvent } from 'storybook/test'

function ControlledPicker({ value, onChange }: ColorPickerProps) {
	const [color, setColor] = useState(value)

	return (
		<ColorPicker
			value={color}
			onChange={(next) => {
				setColor(next)
				onChange?.(next)
			}}
		/>
	)
}

const meta = {
	title: 'UI/ColorPicker',
	component: ColorPicker,
	args: { value: '#FF607F', onChange: fn() },
	globals: { locale: 'en' },
	render: (args) => <ControlledPicker key={args.value} {...args} />,
} satisfies Meta<typeof ColorPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Interactive: Story = {
	play: async ({ args, canvas }) => {
		const hex = canvas.getByRole('textbox', { name: 'Hex color' })
		const hue = canvas.getByRole('slider', { name: 'Hue' })

		await userEvent.tab()
		await expect(hue).toHaveFocus()

		await userEvent.clear(hex)
		await userEvent.type(hex, '#808080')
		await userEvent.keyboard('{Enter}')
		await expect(args.onChange).toHaveBeenLastCalledWith('#808080')

		await fireEvent.input(hue, { target: { value: '1' } })
		await expect(hue).toHaveValue('1')
		await expect(hex).toHaveValue('#808080')

		await fireEvent.input(canvas.getByRole('slider', { name: 'Saturation' }), {
			target: { value: '100' },
		})
		await expect(hex).toHaveValue('#FF0501')

		await fireEvent.input(canvas.getByRole('slider', { name: 'Opacity' }), {
			target: { value: '0' },
		})
		await expect(args.onChange).toHaveBeenLastCalledWith('#FF050100')

		const preset = canvas.getByRole('button', { name: 'Select #0093AF' })
		await userEvent.click(preset)
		await expect(preset).toHaveAttribute('aria-pressed', 'true')
		await expect(hex).toHaveValue('#0093AF')

		await userEvent.clear(hex)
		await userEvent.type(hex, 'invalid')
		await userEvent.keyboard('{Enter}')
		await expect(hex).toHaveValue('#0093AF')
	},
}

export const Dark: Story = {
	globals: { theme: 'dark' },
	args: { value: '#0070FFB3' },
}
