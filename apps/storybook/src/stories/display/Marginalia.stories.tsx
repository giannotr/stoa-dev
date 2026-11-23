import {
	Marginalia,
	MarginaliaCallout,
	MarginaliaFigure,
	MarginaliaFramed,
	MarginaliaNumber,
	MarginaliaPair,
	MarginaliaStack,
	MarginaliaStatus,
} from '@stoa-dev/kit/display'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Thermometer } from 'lucide-react'
import { expect } from 'storybook/test'

/**
 * Marginalia: quiet annotations at the edges of a screen — date, year,
 * page index — as in printed margins.
 */
const meta = {
	title: 'Display/Marginalia',
	component: MarginaliaPair,
	args: { left: 'Mi', right: '18. November' },
} satisfies Meta<typeof MarginaliaPair>

export default meta
type Story = StoryObj<typeof meta>

export const Paired: Story = {}

export const Single: Story = {
	render: () => <Marginalia value='2026' />,
}

/** Optional unit after the value: smaller and muted, text or icon. */
export const SingleWithUnit: Story = {
	render: () => (
		<div className='flex items-baseline gap-8'>
			<Marginalia value='12,4' unit='km' />
			<Marginalia value='87' unit='%' />
			<Marginalia value='21' unit='°C' unitLabel='Grad Celsius' />
			<Marginalia
				value='38'
				unit={<Thermometer />}
				unitLabel='Grad Körpertemperatur'
			/>
			<Marginalia value='329' unit='min' className='text-3xl' />
		</div>
	),
	play: async ({ canvasElement }) => {
		const [km, , celsius, icon] = canvasElement.querySelectorAll(
			'[data-slot="marginalia"]',
		)
		const unit = km.querySelector('[data-slot="marginalia-unit"]') as Element
		await expect(km).toHaveTextContent('12,4km')
		// Smaller than the value and muted.
		await expect(
			Number.parseFloat(getComputedStyle(unit).fontSize),
		).toBeLessThan(Number.parseFloat(getComputedStyle(km).fontSize))
		await expect(getComputedStyle(unit).color).not.toBe(
			getComputedStyle(km).color,
		)
		// A unitLabel replaces the visible unit for screen readers.
		await expect(
			celsius.querySelector('[data-slot="marginalia-unit"]'),
		).toHaveAttribute('aria-hidden', 'true')
		await expect(celsius).toHaveTextContent('Grad Celsius')
		const svg = icon.querySelector('svg') as SVGElement
		await expect(svg.getBoundingClientRect().height).toBeLessThan(
			Number.parseFloat(getComputedStyle(icon).fontSize),
		)
	},
}

export const Framed: Story = {
	render: () => <MarginaliaFramed value='013' />,
}

/** Typical screen header: date left, year right, page index at the bottom. */
export const HeaderLine: Story = {
	render: (args) => (
		<div className='grid max-w-3xl gap-10'>
			<div className='flex items-center justify-between'>
				<MarginaliaPair {...args} />
				<Marginalia value='2026' />
			</div>
			<MarginaliaFramed value='013' />
		</div>
	),
}

/** "#" in the app accent; the mark is hidden from screen readers. */
export const NumberMark: Story = {
	render: () => (
		<div className='flex items-baseline gap-8'>
			<MarginaliaNumber value={42} />
			<MarginaliaNumber value='0815' className='text-3xl' />
			<MarginaliaNumber value='A-7' prefix='§' />
		</div>
	),
	play: async ({ canvasElement }) => {
		const number = canvasElement.querySelector(
			'[data-slot="marginalia-number"]',
		)
		await expect(number).toHaveTextContent('#42')
		const mark = canvasElement.querySelector(
			'[data-slot="marginalia-number-prefix"]',
		)
		await expect(mark).toHaveAttribute('aria-hidden', 'true')
		// The mark takes the accent colour, the figure keeps the text colour.
		await expect(getComputedStyle(mark as Element).color).not.toBe(
			getComputedStyle(number as Element).color,
		)
	},
}

/** A key figure in a frame with a pointer, flanked by two quiet words. */
export const Callout: Story = {
	render: () => (
		<div className='flex flex-wrap items-end gap-12'>
			<MarginaliaCallout left='APC' value={342} right='LDS' />
			<MarginaliaCallout value='01:45' />
		</div>
	),
}

/** Corner readings, left- and right-aligned. */
export const Stack: Story = {
	render: () => (
		<div className='flex max-w-xl justify-between'>
			<MarginaliaStack
				label='LF'
				value='7.2'
				lines={['STL 275', '153° / 32']}
			/>
			<MarginaliaStack
				label='RF'
				value='8.6'
				lines={['STL 268', '126° / 20']}
				align='end'
			/>
		</div>
	),
}

/** A large figure with two small stacked readings. */
export const Figure: Story = {
	render: () => (
		<div className='flex gap-12'>
			<MarginaliaFigure
				label='Übezeit ×min'
				value={329}
				upper={35}
				lower='031'
			/>
			<MarginaliaFigure label='Stücke' value={206} upper={80} lower={912} />
		</div>
	),
}

export const Status: Story = {
	render: () => (
		<MarginaliaStatus>Alle Änderungen gespeichert</MarginaliaStatus>
	),
	play: async ({ canvasElement }) => {
		const status = canvasElement.querySelector(
			'[data-slot="marginalia-status"]',
		)
		await expect(status).toHaveTextContent(
			/^::\s*Alle Änderungen gespeichert\s*::$/,
		)
		const colons = status?.querySelectorAll('[aria-hidden="true"]')
		await expect(colons).toHaveLength(2)
	},
}

/** All marginalia around a screen, after the instrument references. */
export const Readout: Story = {
	parameters: { layout: 'fullscreen' },
	render: () => (
		<div className='relative grid min-h-[34rem] grid-rows-[auto_1fr_auto] gap-8 p-10'>
			<div className='grid grid-cols-[1fr_auto_1fr] items-start'>
				<MarginaliaStack
					label='LF'
					value='7.2'
					lines={['STL 275', '153° / 32']}
				/>
				<MarginaliaCallout left='APC' value={342} right='LDS' />
				<MarginaliaStack
					label='RF'
					value='8.6'
					lines={['STL 268', '126° / 20']}
					align='end'
					className='justify-self-end'
				/>
			</div>
			<div className='flex items-center justify-center gap-16'>
				<MarginaliaFigure
					label='Übezeit ×min'
					value={329}
					upper={35}
					lower='031'
				/>
				<MarginaliaNumber value={42} className='text-5xl font-light' />
			</div>
			<div className='grid grid-cols-[1fr_auto_1fr] items-end'>
				<MarginaliaPair left='Mi' right='18. November' />
				<MarginaliaStatus>Alle Änderungen gespeichert</MarginaliaStatus>
				<div className='flex items-center justify-end gap-4'>
					<Marginalia value='2026' />
					<MarginaliaFramed value='013' />
				</div>
			</div>
		</div>
	),
}
