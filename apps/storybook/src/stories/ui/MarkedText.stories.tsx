import { MarkedText } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'UI/MarkedText',
	component: MarkedText,
	args: { children: 'Erst langsam üben.\nDas Tempo erst danach erhöhen.' },
} satisfies Meta<typeof MarkedText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Quote: Story = {
	render: () => (
		<MarkedText asChild color='#8b5cf6'>
			<blockquote>
				Hör zuerst auf die Melodie und dann auf die Begleitung.
			</blockquote>
		</MarkedText>
	),
}
