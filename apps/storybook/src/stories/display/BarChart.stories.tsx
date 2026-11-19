import {
	BarChart,
	BarChartItem,
	type BarChartSegment,
} from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

const week = [
	['Mo', 23],
	['Di', 17],
	['Mi', 19],
	['Do', 21],
	['Fr', 24],
	['Sa', 12],
	['So', 9],
] as const

const meta = {
	title: 'Display/BarChart',
	component: BarChart,
	args: { label: 'Minuten pro Tag', children: null },
	render: (args) => (
		<div className='max-w-2xl'>
			<BarChart {...args}>
				{week.map(([label, value]) => (
					<BarChartItem key={label} label={label} value={value} />
				))}
			</BarChart>
		</div>
	),
} satisfies Meta<typeof BarChart>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {}

export const Horizontal: Story = { args: { variant: 'horizontal' } }

/** A fixed scale keeps several charts comparable. */
export const FixedScale: Story = { args: { max: 60 } }

const months = [
	['Jan.', 'Januar 2026', 75, 25],
	['Feb.', 'Februar 2026', 0, 0],
	['März', 'März 2026', 135, 0],
	['Apr.', 'April 2026', 0, 90],
] as const

function segments(paid: number, open: number): BarChartSegment[] {
	return [
		{ id: 'paid', label: 'Bezahlt', value: paid, className: 'bg-primary' },
		{
			id: 'open',
			label: 'Offen',
			value: open,
			className: 'bg-muted-foreground/60',
		},
	]
}

const euro = new Intl.NumberFormat('de-DE', {
	style: 'currency',
	currency: 'EUR',
})

function getSlot(parent: Element, slot: string) {
	const element = parent.querySelector(`[data-slot="${slot}"]`)
	if (!element) throw new Error(`Missing ${slot}`)
	return element
}

function barHeightShare(bar: Element) {
	const track = bar.parentElement
	if (!track) throw new Error('Missing bar track')
	return (
		bar.getBoundingClientRect().height / track.getBoundingClientRect().height
	)
}

const stackedMonths: Story['render'] = (args) => (
	<div className='w-full max-w-[32rem]'>
		<BarChart {...args} formatValue={(value) => euro.format(value)}>
			{months.map(([label, detailLabel, paid, open]) => (
				<BarChartItem
					key={detailLabel}
					label={label}
					detailLabel={detailLabel}
					totalLabel='Ausgestellt'
					segments={segments(paid, open)}
				/>
			))}
		</BarChart>
	</div>
)

export const StackedVertical: Story = {
	args: { label: 'Rechnungen pro Monat' },
	render: stackedMonths,
	play: async ({ canvas }) => {
		const item = canvas.getAllByRole('listitem')[0]
		const bar = getSlot(item, 'bar-chart-bar')
		const first = getSlot(bar, 'bar-chart-segment')
		const bounds = bar.getBoundingClientRect()
		const firstBounds = first.getBoundingClientRect()
		await expect(firstBounds.bottom).toBeCloseTo(bounds.bottom, 0)
		await expect(firstBounds.height / bounds.height).toBeCloseTo(0.75)
	},
}

export const StackedHorizontal: Story = {
	args: { label: 'Rechnungen pro Monat', variant: 'horizontal', max: 200 },
	render: stackedMonths,
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole('button', { name: /Januar 2026 100,00/ })
		const item = canvas.getAllByRole('listitem')[0]
		const bar = getSlot(item, 'bar-chart-bar')
		const first = getSlot(bar, 'bar-chart-segment')
		const track = bar.parentElement
		if (!track) throw new Error('Missing bar track')
		await expect(
			bar.getBoundingClientRect().width / track.clientWidth,
		).toBeCloseTo(0.5)
		await expect(
			first.getBoundingClientRect().width / bar.getBoundingClientRect().width,
		).toBeCloseTo(0.75)

		await userEvent.tab()
		await expect(trigger).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		let dialog = within(
			await screen.findByRole('dialog', { name: 'Januar 2026' }),
		)
		for (const [label, value] of [
			['Ausgestellt', '100,00'],
			['Bezahlt', '75,00'],
			['Offen', '25,00'],
		]) {
			await expect(
				dialog.getByText(label).nextElementSibling,
			).toHaveTextContent(value)
		}
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(trigger).toHaveFocus())

		await userEvent.tab()
		const zero = canvas.getByRole('button', { name: /Februar 2026 0,00/ })
		await expect(zero).toHaveFocus()
		await userEvent.keyboard(' ')
		dialog = within(await screen.findByRole('dialog', { name: 'Februar 2026' }))
		await expect(
			dialog.getByText('Offen').nextElementSibling,
		).toHaveTextContent('0,00')
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(zero).toHaveFocus())
	},
}

export const StackedNarrow: Story = {
	args: { label: 'Rechnungen pro Monat', variant: 'horizontal' },
	globals: { theme: 'dark' },
	decorators: [
		(Story) => (
			<div className='max-w-[17rem]'>
				<Story />
			</div>
		),
	],
	render: (args) => (
		<BarChart {...args} formatValue={(value) => euro.format(value)}>
			{months.map(([label, detailLabel, paid, open]) => (
				<BarChartItem
					key={detailLabel}
					label={label === 'Jan.' ? 'Januar mit langer Beschriftung' : label}
					detailLabel={detailLabel}
					totalLabel='Ausgestellt'
					segments={segments(paid * 12_345_678, open * 12_345_678)}
				/>
			))}
		</BarChart>
	),
}

export const StackedScaling: Story = {
	render: () => (
		<>
			<BarChart label='Automatische Skala' max={Number.NaN}>
				<BarChartItem label='Einfach' value={100} display='Hundert' />
				<BarChartItem
					label='Größter Stapel'
					totalLabel='Gesamt'
					segments={segments(125, 75)}
				/>
				<BarChartItem label='Leerer Stapel' totalLabel='Gesamt' segments={[]} />
			</BarChart>
			<BarChart label='Feste Skala' max={50}>
				<BarChartItem
					label='Über Maximum'
					totalLabel='Gesamt'
					segments={segments(75, 25)}
				/>
			</BarChart>
			<BarChart label='Nullwerte'>
				<BarChartItem
					label='Ungültige Segmente'
					totalLabel='Gesamt'
					segments={segments(-10, Infinity)}
				/>
			</BarChart>
		</>
	),
	play: async ({ canvas }) => {
		const bars = canvas
			.getByRole('list', { name: 'Automatische Skala' })
			.querySelectorAll('[data-slot="bar-chart-bar"]')
		await expect(barHeightShare(bars[0])).toBeCloseTo(0.5)
		await expect(barHeightShare(bars[1])).toBeCloseTo(1)
		await expect(barHeightShare(bars[2])).toBe(0)
		await expect(
			within(canvas.getAllByRole('listitem')[0]).queryByRole('button'),
		).toBeNull()
		await expect(canvas.getByText('Hundert')).toBeVisible()

		const full = getSlot(
			canvas.getByRole('list', { name: 'Feste Skala' }),
			'bar-chart-bar',
		)
		await expect(barHeightShare(full)).toBeCloseTo(1)
		await expect(full.firstElementChild).toHaveStyle({ flexBasis: '75%' })
		const zero = getSlot(
			canvas.getByRole('list', { name: 'Nullwerte' }),
			'bar-chart-bar',
		)
		await expect(barHeightShare(zero)).toBe(0)
		await expect(zero.firstElementChild).toHaveStyle({ flexBasis: '0%' })
	},
}
