import { DatePickerInput } from '@stoa-dev/kit/shell'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'

type Args = React.ComponentProps<typeof DatePickerInput>

/** Controlled like in the apps; the current ISO value is shown below the field. */
function Controlled(args: Args) {
	const [value, setValue] = useState(args.value)
	return (
		<div className='grid max-w-sm gap-3'>
			<DatePickerInput
				{...args}
				value={value}
				onChange={(next) => {
					setValue(next)
					args.onChange(next)
				}}
			/>
			<output data-testid='value' className='text-sm text-muted-foreground'>
				{value || '–'}
			</output>
		</div>
	)
}

const meta = {
	title: 'Shell/DatePickerInput',
	component: DatePickerInput,
	render: (args) => <Controlled {...args} />,
	args: {
		id: 'date',
		label: 'Datum',
		value: '2026-11-17',
		onChange: () => {},
	},
} satisfies Meta<typeof DatePickerInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { value: '' } }

export const Invalid: Story = { args: { invalid: true, required: true } }

export const Disabled: Story = { args: { disabled: true } }

export const HiddenLabel: Story = { args: { hideLabel: true } }

/** Only past dates up to today, e.g. for a purchase date. */
export const PastOnly: Story = {
	args: { endMonth: new Date() },
}

/**
 * Regression test for 0.1.4: clicking the month/year selects used to close the
 * popover before anything could be chosen.
 */
export const JumpToAnotherYear: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: /datum auswählen/i }),
		)
		const year = await screen.findByRole('combobox', { name: /jahr/i })

		// The select sits invisibly (opacity 0) on top of its label, so check that
		// the click kept the calendar open and focused the select instead.
		await userEvent.click(year)
		await expect(screen.getByRole('grid')).toBeInTheDocument()
		await expect(year).toHaveFocus()

		await userEvent.selectOptions(year, '2012')
		await userEvent.selectOptions(
			screen.getByRole('combobox', { name: /monat/i }),
			'4',
		)
		await userEvent.click(screen.getByRole('button', { name: /15\. Mai 2012/ }))

		await waitFor(() =>
			expect(canvas.getByTestId('value')).toHaveTextContent('2012-05-15'),
		)
		await expect(canvas.getByLabelText('Datum')).toHaveValue('15. Mai 2012')
	},
}

export const TypeADate: Story = {
	args: { value: '' },
	play: async ({ canvas }) => {
		const input = canvas.getByLabelText('Datum')
		await userEvent.type(input, '24.12.2025')
		await userEvent.tab()
		await expect(canvas.getByTestId('value')).toHaveTextContent('2025-12-24')
	},
}
