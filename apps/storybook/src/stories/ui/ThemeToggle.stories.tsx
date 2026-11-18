import { ThemeToggle, type ThemeToggleProps } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'

function InteractiveToggle(args: ThemeToggleProps) {
	const [theme, setTheme] = useState(args.theme)

	return (
		<ThemeToggle
			{...args}
			theme={theme}
			onToggle={(nextTheme) => {
				setTheme(nextTheme)
				return args.onToggle(nextTheme)
			}}
		/>
	)
}

const meta = {
	title: 'UI/ThemeToggle',
	component: ThemeToggle,
	args: { theme: 'light', onToggle: fn() },
	render: (args) => <InteractiveToggle {...args} key={args.theme} />,
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
	play: async ({ args, canvas }) => {
		const button = canvas.getByRole('button')

		await expect(button).toHaveAttribute('aria-pressed', 'false')
		await expect(button.querySelector('svg.lucide-sun')).toBeVisible()

		await userEvent.tab()
		await expect(button).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		await expect(button).toHaveAttribute('aria-pressed', 'true')
		await expect(button.querySelector('svg.lucide-moon')).toBeVisible()
		await expect(args.onToggle).toHaveBeenLastCalledWith('dark')

		await userEvent.click(button)
		await expect(button).toHaveAttribute('aria-pressed', 'false')
		await expect(button.querySelector('svg.lucide-sun')).toBeVisible()
		await expect(args.onToggle).toHaveBeenLastCalledWith('light')
	},
}

export const Dark: Story = {
	globals: { theme: 'dark' },
	args: { theme: 'dark' },
}
