import { Button } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { fn } from 'storybook/test'

const meta = {
	title: 'UI/Button',
	component: Button,
	args: { children: 'Speichern', onClick: fn() },
	argTypes: {
		variant: {
			control: 'select',
			options: [
				'default',
				'outline',
				'secondary',
				'ghost',
				'destructive',
				'link',
			],
		},
	},
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AllVariants: Story = {
	render: (args) => (
		<div className='flex flex-wrap items-center gap-3'>
			{(
				[
					'default',
					'outline',
					'secondary',
					'ghost',
					'destructive',
					'link',
				] as const
			).map((variant) => (
				<Button key={variant} {...args} variant={variant}>
					{variant}
				</Button>
			))}
		</div>
	),
}

export const WithIcon: Story = {
	args: {
		children: (
			<>
				<Plus /> Neues Stück
			</>
		),
	},
}

export const Disabled: Story = { args: { disabled: true } }
