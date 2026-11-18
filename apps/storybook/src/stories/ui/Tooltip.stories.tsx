import {
	Button,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Info } from 'lucide-react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'

const meta = {
	title: 'UI/Tooltip',
	component: TooltipContent,
	parameters: { layout: 'centered' },
	args: {
		children: 'Die nächste Rechnungsnummer wird automatisch vergeben.',
		side: 'top',
		sideOffset: 8,
	},
	render: (args) => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='outline'
					size='icon'
					aria-label='Hinweis zur Rechnungsnummer'
				>
					<Info aria-hidden='true' />
				</Button>
			</TooltipTrigger>
			<TooltipContent {...args} />
		</Tooltip>
	),
} satisfies Meta<typeof TooltipContent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole('button', {
			name: 'Hinweis zur Rechnungsnummer',
		})

		await userEvent.tab()
		await expect(trigger).toHaveFocus()
		await expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'Die nächste Rechnungsnummer wird automatisch vergeben.',
		)

		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull())

		await userEvent.hover(trigger)
		const tooltip = await screen.findByRole('tooltip')
		const content = tooltip.closest('[data-slot="tooltip-content"]')
		await expect(content).toHaveStyle({ fontWeight: '300' })
	},
}
