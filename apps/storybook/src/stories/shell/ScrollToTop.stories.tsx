import { ScrollToTop } from '@stoa-dev/kit/shell'
import { Card, CardContent, CardHeader, CardTitle } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'

const entries = Array.from({ length: 24 }, (_, index) => index + 1)

/** A scroll area like the content column of the apps. */
function ScrollArea({ threshold }: { threshold?: number }) {
	return (
		<div
			data-testid='scroll-area'
			className='relative h-[28rem] overflow-y-auto rounded-2xl'
		>
			<div className='grid gap-4 p-1'>
				{entries.map((entry) => (
					<Card key={entry} size='sm'>
						<CardHeader>
							<CardTitle>Eintrag {entry}</CardTitle>
						</CardHeader>
						<CardContent>Tonleitern, Etüde, Vom-Blatt-Spiel.</CardContent>
					</Card>
				))}
			</div>
			{/* Finds the scroll area by itself: no ref needed. */}
			<ScrollToTop threshold={threshold} />
		</div>
	)
}

const meta = {
	title: 'Shell/ScrollToTop',
	component: ScrollToTop,
	render: (args) => <ScrollArea threshold={args.threshold} />,
	args: { threshold: 320 },
} satisfies Meta<typeof ScrollToTop>

export default meta
type Story = StoryObj<typeof meta>

/** Scroll down inside the area: the button fades in at the bottom right. */
export const Default: Story = {}

export const AppearsAndReturns: Story = {
	play: async ({ canvas }) => {
		const area = canvas.getByTestId('scroll-area')
		await expect(canvas.queryByRole('button', { name: 'Nach oben' })).toBeNull()

		area.scrollTop = 900
		area.dispatchEvent(new Event('scroll'))
		const button = await canvas.findByRole('button', { name: 'Nach oben' })

		await userEvent.click(button)
		await waitFor(() => expect(area.scrollTop).toBe(0))
		await expect(area).toHaveFocus()
		await waitFor(() =>
			expect(canvas.queryByRole('button', { name: 'Nach oben' })).toBeNull(),
		)
	},
}

/** With an explicit ref and placed by the layout, e.g. in a toolbar. */
export const InlineWithRef: Story = {
	render: function Render() {
		const ref = useRef<HTMLDivElement>(null)
		return (
			<div className='grid gap-3'>
				<div className='flex h-14 items-center justify-end'>
					<ScrollToTop
						scrollContainerRef={ref}
						floating={false}
						threshold={0}
					/>
				</div>
				<div ref={ref} className='h-80 overflow-y-auto rounded-2xl'>
					<div className='grid gap-4 p-1'>
						{entries.map((entry) => (
							<Card key={entry} size='sm'>
								<CardContent>Eintrag {entry}</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		)
	},
}
