import { TagInput } from '@stoa-dev/kit/shell'
import { Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'

type Args = React.ComponentProps<typeof TagInput>

function Controlled(args: Args) {
	const [tags, setTags] = useState(args.value)
	return (
		<div className='grid max-w-md gap-2'>
			<Label htmlFor='tags'>Schlagwörter</Label>
			<TagInput {...args} id='tags' value={tags} onChange={setTags} />
			<output data-testid='tags' className='text-xs text-muted-foreground'>
				{tags.join(' · ')}
			</output>
		</div>
	)
}

const meta = {
	title: 'Shell/TagInput',
	component: TagInput,
	render: (args) => <Controlled {...args} />,
	args: {
		value: ['Tonleiter', 'Legato'],
		onChange: () => {},
		suggestions: ['Staccato', 'Vom Blatt', 'Tonleiter'],
	},
} satisfies Meta<typeof TagInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { value: [] } }
export const Disabled: Story = { args: { disabled: true } }

/** Enter and comma add tags, duplicates are dropped, Backspace removes the last. */
export const Typing: Story = {
	args: { value: [] },
	play: async ({ canvas }) => {
		const input = canvas.getByLabelText('Schlagwörter')
		await userEvent.type(input, 'Etüde{Enter}Tempo, etüde,')
		await expect(canvas.getByTestId('tags')).toHaveTextContent('Etüde · Tempo')
		await userEvent.type(input, '{Backspace}')
		await expect(canvas.getByTestId('tags')).toHaveTextContent('Etüde')
	},
}
