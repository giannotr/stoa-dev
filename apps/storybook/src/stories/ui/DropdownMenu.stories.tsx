import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
	Archive,
	Copy,
	Download,
	EllipsisVertical,
	Pencil,
	Trash2,
} from 'lucide-react'
import { expect, screen, userEvent } from 'storybook/test'

const meta = {
	title: 'UI/DropdownMenu',
	component: DropdownMenu,
	parameters: { layout: 'centered' },
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

/** The typical three-dots context menu of list entries. */
export const ContextMenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='icon' aria-label='Weitere Aktionen'>
					<EllipsisVertical />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuItem>
					<Pencil /> Bearbeiten
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Copy /> Duplizieren
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Download /> Exportieren als
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>PDF</DropdownMenuItem>
						<DropdownMenuItem>XRechnung (XML)</DropdownMenuItem>
						<DropdownMenuItem>ZUGFeRD</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Archive /> Archivieren
				</DropdownMenuItem>
				<DropdownMenuItem variant='destructive'>
					<Trash2 /> Löschen
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
	/** Since 0.1.3 menus are at least 12rem wide, even on a 32px trigger. */
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: 'Weitere Aktionen' }),
		)
		const menu = await screen.findByRole('menu')
		// offsetWidth ignores the 95 % zoom-in transform of the opening animation.
		await expect(menu.offsetWidth).toBeGreaterThanOrEqual(192)
	},
}

export const WithLabel: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline'>Konto</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Angemeldet als Lehrkraft</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>Profil</DropdownMenuItem>
				<DropdownMenuItem>Einstellungen</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
}
