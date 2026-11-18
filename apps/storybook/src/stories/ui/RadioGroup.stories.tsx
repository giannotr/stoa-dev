import { Label, RadioGroup, RadioGroupItem } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'

const options = [
	['planned', 'Geplant'],
	['practice', 'In Arbeit'],
	['done', 'Abgeschlossen'],
] as const

const meta = {
	title: 'UI/RadioGroup',
	component: RadioGroup,
	args: { defaultValue: 'practice' },
	render: (args) => (
		<RadioGroup aria-label='Status' {...args}>
			{options.map(([value, label]) => (
				<div key={value} className='flex items-center gap-2'>
					<RadioGroupItem id={`radio-${value}`} value={value} />
					<Label htmlFor={`radio-${value}`}>{label}</Label>
				</div>
			))}
		</RadioGroup>
	),
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }

export const SelectAnother: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByLabelText('Abgeschlossen'))
		await expect(
			canvas.getByRole('radio', { name: 'Abgeschlossen' }),
		).toBeChecked()
	},
}
