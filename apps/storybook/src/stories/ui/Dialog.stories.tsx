import {
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'

const meta = {
	title: 'UI/Dialog',
	component: Dialog,
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Schüler anlegen</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Neuer Schüler</DialogTitle>
					<DialogDescription>
						Name und Instrument lassen sich später ändern.
					</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4'>
					<div className='grid gap-2'>
						<Label htmlFor='dlg-name'>Name</Label>
						<Input id='dlg-name' placeholder='Vor- und Nachname' />
					</div>
					<div className='grid gap-2'>
						<Label htmlFor='dlg-instrument'>Instrument</Label>
						<Input id='dlg-instrument' placeholder='z. B. Klavier' />
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='outline'>Abbrechen</Button>
					</DialogClose>
					<Button>Anlegen</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OpenAndCancel: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: 'Schüler anlegen' }),
		)
		const dialog = await screen.findByRole('dialog')
		await expect(dialog).toHaveTextContent('Neuer Schüler')
		await userEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	},
}
