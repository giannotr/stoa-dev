import {
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { EllipsisVertical } from 'lucide-react'

const meta = {
	title: 'UI/Card',
	component: Card,
	decorators: [
		(Story) => (
			<div className='max-w-md'>
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Diese Woche</CardTitle>
				<CardDescription>Minuten pro Tag</CardDescription>
			</CardHeader>
			<CardContent>Inhalt der Karte.</CardContent>
		</Card>
	),
}

export const WithActionAndFooter: Story = {
	render: () => (
		<Card>
			<CardHeader>
				<CardTitle>Etüde Nr. 4</CardTitle>
				<CardDescription>Zuletzt geübt vor 2 Tagen</CardDescription>
				<CardAction>
					<Button variant='ghost' size='icon' aria-label='Weitere Aktionen'>
						<EllipsisVertical />
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>Tempo 72 → 96, linke Hand separat.</CardContent>
			<CardFooter className='gap-3'>
				<Button>Üben</Button>
				<Button variant='outline'>Details</Button>
			</CardFooter>
		</Card>
	),
}

export const Small: Story = {
	render: () => (
		<Card size='sm'>
			<CardHeader>
				<CardTitle>Kompakt</CardTitle>
			</CardHeader>
			<CardContent>Kleinere Abstände für dichte Listen.</CardContent>
		</Card>
	),
}
