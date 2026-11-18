import { PageHeading, SubNavigation } from '@stoa-dev/kit/shell'
import { Card, CardContent, CardHeader, CardTitle } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'

const sections = [
	{
		id: 'general',
		label: 'Allgemein',
		text: 'Sprache und Darstellung der App.',
	},
	{
		id: 'invoices',
		label: 'Rechnungen',
		text: 'Standards für Rechnungsnummern und Zahlungsziele.',
	},
	{
		id: 'brand',
		label: 'Design',
		text: 'Farben, Schrift und Logo für deine Rechnungen.',
	},
]

function SettingsPreview({ floating }: { floating?: boolean }) {
	const contentRef = useRef<HTMLDivElement>(null)

	return (
		<div className='mx-auto h-[min(75vh,28rem)] max-w-3xl overflow-y-auto rounded-xl border bg-background'>
			<div ref={contentRef} className='p-4'>
				<PageHeading>Einstellungen</PageHeading>
				<SubNavigation
					sections={sections}
					label='Einstellungsbereiche'
					scrollContainerRef={contentRef}
					floating={floating}
				/>
				<div className='grid gap-4'>
					{sections.map(({ id, label, text }) => (
						<section
							key={id}
							id={id}
							tabIndex={-1}
							aria-labelledby={`${id}-title`}
							className='outline-none'
						>
							<Card className='min-h-80'>
								<CardHeader>
									<CardTitle id={`${id}-title`}>{label}</CardTitle>
								</CardHeader>
								<CardContent>{text}</CardContent>
							</Card>
						</section>
					))}
				</div>
			</div>
		</div>
	)
}

const meta = {
	title: 'Shell/SubNavigation',
	component: SettingsPreview,
} satisfies Meta<typeof SettingsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Floating: Story = {
	args: { floating: true },
	play: async ({ canvas }) => {
		const navigation = canvas.getByRole('navigation', {
			name: 'Einstellungsbereiche',
		})
		const invoices = canvas.getByRole('link', { name: 'Rechnungen' })
		await expect(navigation).toHaveStyle({ position: 'sticky' })
		await userEvent.click(invoices)
		await waitFor(() =>
			expect(invoices).toHaveAttribute('aria-current', 'location'),
		)
		await expect(
			canvas.getByRole('region', { name: 'Rechnungen' }),
		).toHaveFocus()
		await userEvent.click(canvas.getByRole('link', { name: 'Allgemein' }))
	},
}

export const Inline: Story = {
	args: { floating: false },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('navigation', { name: 'Einstellungsbereiche' }),
		).toHaveStyle({
			position: 'static',
		})
	},
}
