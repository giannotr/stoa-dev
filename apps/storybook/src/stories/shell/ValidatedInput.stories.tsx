import { ValidatedInput } from '@stoa-dev/kit/shell'
import { Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'

function Field({ submitted = false }: { submitted?: boolean }) {
	const [value, setValue] = useState('')
	return (
		<div className='grid max-w-sm gap-2'>
			<Label htmlFor='email'>E-Mail</Label>
			<ValidatedInput
				id='email'
				value={value}
				onChange={(event) => setValue(event.target.value)}
				problem={!/^\S+@\S+\.\S+$/.test(value)}
				submitted={submitted}
				placeholder='name@beispiel.de'
			/>
		</div>
	)
}

const meta = {
	title: 'Shell/ValidatedInput',
	component: Field,
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

/** Quiet until the field is left once. */
export const Untouched: Story = {
	play: async ({ canvas }) => {
		const input = canvas.getByLabelText('E-Mail')
		await expect(input).toHaveAttribute('aria-invalid', 'false')
		await userEvent.click(input)
		await userEvent.tab()
		await expect(input).toHaveAttribute('aria-invalid', 'true')
	},
}

export const AfterSubmit: Story = { args: { submitted: true } }
