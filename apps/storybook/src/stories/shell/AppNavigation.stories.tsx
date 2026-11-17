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
import { expect, fn } from 'storybook/test'

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
				<AppNavigationThemeToggle key='theme' onToggle={fn()} />,
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
