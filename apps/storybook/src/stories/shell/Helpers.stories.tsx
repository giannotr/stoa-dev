import { AnimatedSwap, ExternalLink } from '@stoa-dev/kit/shell'
import { Button } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

const meta = {
	title: 'Shell/Helpers',
	parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** Opens in the system browser inside Tauri, in a new tab here. */
export const Link: Story = {
	render: () => (
		<p className='text-sm'>
			Mehr dazu in der{' '}
			<ExternalLink href='https://github.com/github/mona-sans'>
				Mona-Sans-Dokumentation
			</ExternalLink>
			.
		</p>
	),
}

/** Cross-fades between two toolbars and animates the height in between. */
export const Swap: Story = {
	render: function Render() {
		const [selection, setSelection] = useState(false)
		return (
			<div className='grid max-w-md gap-4'>
				<Button
					variant='outline'
					onClick={() => setSelection((value) => !value)}
				>
					{selection ? 'Auswahl aufheben' : '3 Einträge auswählen'}
				</Button>
				<AnimatedSwap swapKey={selection ? 'selection' : 'all'}>
					{selection ? (
						<div className='flex flex-wrap gap-2'>
							<Button size='sm'>Exportieren</Button>
							<Button size='sm' variant='outline'>
								Archivieren
							</Button>
							<Button size='sm' variant='destructive'>
								Löschen
							</Button>
						</div>
					) : (
						<p className='text-sm text-muted-foreground'>
							Wähle Einträge aus, um Aktionen zu sehen.
						</p>
					)}
				</AnimatedSwap>
			</div>
		)
	},
}
