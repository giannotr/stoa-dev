import { ThemeSwitch, type ThemeSwitchProps } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'

function ThemePreview({
	instrument,
	...args
}: ThemeSwitchProps & { instrument: boolean }) {
	const [theme, setTheme] = useState(args.theme)
	const dark = theme === 'dark'

	return (
		<section
			aria-label='Vorschau'
			className={`${instrument ? 'stoa-instrument' : ''} ${dark ? 'dark' : ''} box-border w-full max-w-sm rounded-3xl bg-background p-4 text-foreground`}
			style={{ colorScheme: theme }}
		>
			<div className='flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 text-card-foreground shadow-(--surface-shadow)'>
				<div>
					<h2 className='text-base font-semibold'>Darstellung</h2>
					<p className='text-sm text-muted-foreground'>
						{dark ? 'Dunkel' : 'Hell'}
					</p>
				</div>
				<ThemeSwitch
					{...args}
					theme={theme}
					onToggle={(nextTheme) => {
						setTheme(nextTheme)
						return args.onToggle(nextTheme)
					}}
				/>
			</div>
		</section>
	)
}

const meta = {
	title: 'UI/ThemeSwitch',
	component: ThemeSwitch,
	globals: { theme: 'light' },
	args: { theme: 'light', onToggle: fn() },
	render: (args, { globals }) => (
		<ThemePreview
			{...args}
			key={args.theme}
			instrument={globals.design === 'instrument'}
		/>
	),
} satisfies Meta<typeof ThemeSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
	play: async ({ args, canvas }) => {
		const toggle = canvas.getByRole('switch')
		const preview = canvas.getByRole('region', { name: 'Vorschau' })

		await expect(toggle).not.toBeChecked()
		await userEvent.tab()
		await expect(toggle).toHaveFocus()
		await userEvent.keyboard(' ')
		await expect(toggle).toBeChecked()
		await expect(preview).toHaveClass('dark')
		await expect(args.onToggle).toHaveBeenLastCalledWith('dark')

		await userEvent.click(toggle)
		await expect(toggle).not.toBeChecked()
		await expect(preview).not.toHaveClass('dark')
		await expect(args.onToggle).toHaveBeenLastCalledWith('light')
	},
}

export const Disabled: Story = {
	args: { theme: 'dark', disabled: true },
	play: async ({ canvas }) => {
		const toggle = canvas.getByRole('switch')

		await expect(toggle).toBeChecked()
		await expect(toggle).toBeDisabled()
	},
}
