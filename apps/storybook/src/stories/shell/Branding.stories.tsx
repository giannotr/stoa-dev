import { BrandLines, PageHeading, Spinner } from '@stoa-dev/kit/shell'
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
	title: 'Shell/Branding',
	component: PageHeading,
	args: { children: 'Einstellungen' },
} satisfies Meta<typeof PageHeading>

export default meta
type Story = StoryObj<typeof meta>

export const Heading: Story = {}

export const PlainHeading: Story = { args: { plain: true } }

export const Lines: Story = {
	render: () => (
		<div className='flex items-center gap-8'>
			<BrandLines />
			<BrandLines loading />
		</div>
	),
}

export const LoadingSpinner: Story = { render: () => <Spinner /> }
