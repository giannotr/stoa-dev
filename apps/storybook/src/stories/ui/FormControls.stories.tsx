import { NativeSelect } from '@stoa-dev/kit/shell'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	Label,
	RadioGroup,
	RadioGroupItem,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
	Textarea,
	Toggle,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bold, Italic, Underline } from 'lucide-react'

const meta = {
	title: 'UI/FormControls',
	parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllControls: Story = {
	render: () => (
		<Card className='max-w-2xl'>
			<CardHeader>
				<CardTitle>Neues Stück</CardTitle>
				<CardDescription>
					Alle Formular-Bausteine des Kits auf einen Blick.
				</CardDescription>
			</CardHeader>
			<CardContent className='grid gap-5 sm:grid-cols-2'>
				<div className='grid gap-2'>
					<Label htmlFor='fc-title'>Titel</Label>
					<Input id='fc-title' placeholder='z. B. Sonate in C-Dur' />
				</div>
				<div className='grid gap-2'>
					<Label htmlFor='fc-invalid'>Opus</Label>
					<Input id='fc-invalid' defaultValue='K. 54x' aria-invalid />
				</div>
				<div className='grid gap-2'>
					<Label htmlFor='fc-native'>Schwierigkeit</Label>
					<NativeSelect id='fc-native' defaultValue='2'>
						<option value='1'>Leicht</option>
						<option value='2'>Mittel</option>
						<option value='3'>Schwer</option>
					</NativeSelect>
				</div>
				<div className='grid gap-2'>
					<Label>Epoche</Label>
					<Select defaultValue='classic'>
						<SelectTrigger className='w-full'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='baroque'>Barock</SelectItem>
							<SelectItem value='classic'>Klassik</SelectItem>
							<SelectItem value='romantic'>Romantik</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='grid gap-2 sm:col-span-2'>
					<Label htmlFor='fc-notes'>Notizen</Label>
					<Textarea id='fc-notes' placeholder='Fingersätze, Tempo, …' />
				</div>
				<div className='grid gap-3'>
					<Label>Status</Label>
					<RadioGroup defaultValue='practice'>
						{[
							['planned', 'Geplant'],
							['practice', 'In Arbeit'],
							['done', 'Abgeschlossen'],
						].map(([value, label]) => (
							<div key={value} className='flex items-center gap-2'>
								<RadioGroupItem id={`fc-${value}`} value={value} />
								<Label htmlFor={`fc-${value}`}>{label}</Label>
							</div>
						))}
					</RadioGroup>
				</div>
				<div className='grid content-start gap-3'>
					<Label>Optionen</Label>
					<div className='flex items-center gap-3'>
						<Switch id='fc-public' defaultChecked />
						<Label htmlFor='fc-public'>Im Repertoire</Label>
					</div>
					<div className='flex items-center gap-3'>
						<Switch id='fc-archive' />
						<Label htmlFor='fc-archive'>Archiviert</Label>
					</div>
					<div className='flex items-center gap-4'>
						<Switch size='sm' aria-label='Klein' defaultChecked />
						<Switch aria-label='Standard' />
						<Switch size='lg' aria-label='Groß' defaultChecked />
					</div>
					<div className='flex gap-2'>
						<Toggle aria-label='Fett' defaultPressed>
							<Bold />
						</Toggle>
						<Toggle aria-label='Kursiv'>
							<Italic />
						</Toggle>
						<Toggle aria-label='Unterstrichen'>
							<Underline />
						</Toggle>
					</div>
				</div>
			</CardContent>
		</Card>
	),
}
