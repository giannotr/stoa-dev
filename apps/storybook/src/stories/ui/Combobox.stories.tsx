import { Combobox, type ComboboxOption, Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'

/** Instruments in German with names in other languages, like practicr's list. */
const instruments: ComboboxOption[] = [
	{
		value: 'Akkordeon',
		synonyms: ['Accordion', 'Fisarmonica', 'Ziehharmonika'],
	},
	{ value: 'Blockflöte', synonyms: ['Recorder', 'Flauto dolce'] },
	{ value: 'Cello', synonyms: ['Violoncello', 'Violoncelle'] },
	{ value: 'Gitarre', synonyms: ['Guitar', 'Chitarra'] },
	{ value: 'Harfe', synonyms: ['Harp', 'Arpa'] },
	{ value: 'Klarinette', synonyms: ['Clarinet', 'Clarinetto'] },
	{ value: 'Klavier', synonyms: ['Piano', 'Pianoforte', 'Flügel'] },
	{ value: 'Kontrabass', synonyms: ['Double bass', 'Contrabbasso'] },
	{ value: 'Querflöte', synonyms: ['Flute', 'Flauto traverso'] },
	{ value: 'Saxophon', synonyms: ['Saxophone', 'Sassofono'] },
	{ value: 'Trompete', synonyms: ['Trumpet', 'Tromba'] },
	{ value: 'Violine', synonyms: ['Geige', 'Violin', 'Violino'] },
]

type Args = React.ComponentProps<typeof Combobox>

function Controlled(args: Args) {
	const [value, setValue] = useState(args.value)
	return (
		<div className='grid max-w-sm gap-2'>
			<Label htmlFor='instrument'>Instrument</Label>
			<Combobox
				{...args}
				id='instrument'
				value={value}
				onValueChange={setValue}
			/>
			<output data-testid='value' className='text-xs text-muted-foreground'>
				{value || '–'}
			</output>
		</div>
	)
}

const meta = {
	title: 'UI/Combobox',
	component: Combobox,
	render: (args) => <Controlled {...args} />,
	args: {
		value: '',
		onValueChange: () => {},
		options: instruments,
		placeholder: 'z. B. Klavier',
	},
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Plain strings work too. */
export const SimpleOptions: Story = {
	args: {
		options: ['Anfänger', 'Fortgeschritten', 'Profi'],
		placeholder: 'Niveau',
	},
}

/** A hint after each value, e.g. a category. */
export const WithHints: Story = {
	args: {
		options: [
			{ value: 'Bach', hint: 'Barock' },
			{ value: 'Mozart', hint: 'Klassik' },
			{ value: 'Chopin', hint: 'Romantik' },
			{ value: 'Debussy', hint: 'Impressionismus' },
		],
		placeholder: 'Komponist',
	},
}

/** Prefix matches first, then contained matches; Enter picks the highlighted one. */
export const TypeAndPick: Story = {
	play: async ({ canvas }) => {
		const input = canvas.getByRole('combobox')
		await userEvent.type(input, 'fl')
		const options = await screen.findAllByRole('option')
		await expect(options.map((option) => option.textContent)).toEqual([
			'Blockflöte',
			'Querflöte',
			'Klavierüber Flügel',
		])
		await userEvent.keyboard('{ArrowDown}{Enter}')
		await expect(canvas.getByTestId('value')).toHaveTextContent('Querflöte')
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
	},
}

/** A synonym finds the option and the list says how. */
export const FindBySynonym: Story = {
	play: async ({ canvas }) => {
		await userEvent.type(canvas.getByRole('combobox'), 'pianoforte')
		const option = await screen.findByRole('option')
		await expect(option).toHaveTextContent('Klavier')
		await expect(option).toHaveTextContent('über Pianoforte')
		await userEvent.click(option)
		await expect(canvas.getByTestId('value')).toHaveTextContent('Klavier')
	},
}

/** Free text stays allowed; Escape only closes the list. */
export const FreeTextAndEscape: Story = {
	play: async ({ canvas }) => {
		const input = canvas.getByRole('combobox')
		await userEvent.type(input, 'Theremin')
		// No match: the list fades out (it may linger for its exit animation).
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
		await expect(canvas.getByTestId('value')).toHaveTextContent('Theremin')
		await userEvent.clear(input)
		await userEvent.type(input, 'gi')
		await screen.findByRole('listbox')
		await userEvent.keyboard('{Escape}')
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
		await expect(canvas.getByTestId('value')).toHaveTextContent('gi')
	},
}
