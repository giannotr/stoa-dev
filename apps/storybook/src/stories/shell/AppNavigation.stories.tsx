import { AppNavigation, AppNavigationThemeToggle } from '@stoa-dev/kit/shell'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
	BookOpen,
	ChartPie,
	Home,
	Library,
	Settings,
	UserRound,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { expect, screen, userEvent } from 'storybook/test'

function NavigationThemeControl() {
	const { forcedTheme } = useTheme()
	const [theme, setTheme] = useState<'light' | 'dark'>()

	return (
		<AppNavigationThemeToggle
			theme={theme ?? (forcedTheme === 'dark' ? 'dark' : 'light')}
			onToggle={setTheme}
			label='Darstellung wechseln'
		/>
	)
}

const meta = {
	title: 'Shell/AppNavigation',
	component: AppNavigation,
	parameters: { route: '/library' },
	decorators: [
		(Story) => (
			<div className='relative h-[28rem]'>
				<Story />
			</div>
		),
	],
	args: {
		label: 'Hauptnavigation',
		groups: [
			[
				{ path: '/', label: 'Übersicht', Icon: Home },
				{
					path: '/library',
					label: 'Bibliothek',
					Icon: Library,
					isActive: (pathname: string) => pathname.startsWith('/library'),
				},
				{ path: '/reading', label: 'Lesen', Icon: BookOpen },
			],
			[{ path: '/statistics', label: 'Statistik', Icon: ChartPie }],
		],
		footerGroups: [
			[
				<NavigationThemeControl key='theme' />,
				{ path: '/user', label: 'Profil', Icon: UserRound },
				{ path: '/settings', label: 'Einstellungen', Icon: Settings },
			],
		],
	},
} satisfies Meta<typeof AppNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('link', { name: 'Bibliothek' }),
		).toHaveAttribute('aria-current', 'page')
		await expect(
			canvas.getByRole('link', { name: 'Übersicht' }),
		).not.toHaveAttribute('aria-current')

		const toggle = canvas.getByRole('button', { name: 'Darstellung wechseln' })
		const pressed = toggle.getAttribute('aria-pressed') === 'true'

		await userEvent.hover(toggle)
		await expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'Darstellung wechseln',
		)
		await userEvent.click(toggle)
		await expect(toggle).toHaveAttribute('aria-pressed', String(!pressed))
		await expect(
			toggle.querySelector(pressed ? 'svg.lucide-sun' : 'svg.lucide-moon'),
		).toBeVisible()
		await userEvent.click(toggle)
		await expect(toggle).toHaveAttribute('aria-pressed', String(pressed))
	},
}

export const DisabledEntry: Story = {
	args: {
		groups: [
			[
				{ path: '/', label: 'Übersicht', Icon: Home },
				{
					path: '/statistics',
					label: 'Statistik',
					Icon: ChartPie,
					disabled: true,
				},
			],
		],
		footerGroups: [],
	},
}
