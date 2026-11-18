import { NativeSelect, SetupWizard } from '@stoa-dev/kit/shell'
import {
	Card,
	CardContent,
	CardHeader,
	Input,
	Label,
	Switch,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'
import { expect, userEvent } from 'storybook/test'

function InvoicerSetup({ failOnce = false }: { failOnce?: boolean }) {
	const [language, setLanguage] = useState('de')
	const [name, setName] = useState('')
	const [customize, setCustomize] = useState(false)
	const [color, setColor] = useState('#43aec5')
	const [completed, setCompleted] = useState(false)
	const attempted = useRef(false)

	async function saveSettings() {
		if (failOnce && !attempted.current) {
			attempted.current = true
			throw new Error('Saving failed')
		}
		setCompleted(true)
	}

	if (completed) {
		return (
			<Card className='mx-auto my-8 max-w-2xl'>
				<CardHeader>
					<h1 className='text-xl font-semibold'>Einrichtung abgeschlossen</h1>
				</CardHeader>
				<CardContent>
					<p>Rechnungen für {name} sind jetzt vorbereitet.</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<SetupWizard
			appName='Invoicer'
			title='Willkommen bei Invoicer'
			description='Richte Sprache, Absender und Design für deine Rechnungen ein.'
			footer='Mit * markierte Felder sind Pflichtfelder.'
			onComplete={saveSettings}
			steps={[
				{
					id: 'language',
					title: 'Sprache',
					description: 'Wähle die Sprache für deine Rechnungen.',
					content: (
						<div className='grid gap-2'>
							<Label htmlFor='wizard-language'>Rechnungssprache</Label>
							<NativeSelect
								id='wizard-language'
								value={language}
								onChange={(event) => setLanguage(event.target.value)}
							>
								<option value='de'>Deutsch</option>
								<option value='en'>English</option>
								<option value='it'>Italiano</option>
							</NativeSelect>
						</div>
					),
				},
				{
					id: 'sender',
					title: 'Absender',
					description: 'Dieser Name erscheint auf deinen Rechnungen.',
					content: (
						<div className='grid gap-2'>
							<Label htmlFor='wizard-name'>
								Name<span aria-hidden='true'> *</span>
							</Label>
							<Input
								id='wizard-name'
								name='name'
								autoComplete='organization'
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
						</div>
					),
				},
				{
					id: 'branding',
					title: 'Design',
					description: 'Passe die Akzentfarbe für deine Rechnungen an.',
					submitLabel: customize ? undefined : 'Design überspringen',
					content: (
						<>
							<div className='flex items-center gap-3'>
								<Switch
									id='wizard-branding'
									checked={customize}
									onCheckedChange={setCustomize}
								/>
								<Label htmlFor='wizard-branding'>Design jetzt anpassen</Label>
							</div>
							{customize && (
								<div className='grid gap-2'>
									<Label htmlFor='wizard-color'>Akzentfarbe</Label>
									<Input
										id='wizard-color'
										type='color'
										value={color}
										onChange={(event) => setColor(event.target.value)}
										className='h-10 w-16 p-1'
									/>
								</div>
							)}
						</>
					),
				},
			]}
		/>
	)
}

const meta = {
	title: 'Shell/SetupWizard',
	component: InvoicerSetup,
} satisfies Meta<typeof InvoicerSetup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RetryAfterError: Story = {
	args: { failOnce: true },
	play: async ({ canvas }) => {
		const next = () => canvas.getByRole('button', { name: 'Weiter' })
		await userEvent.selectOptions(
			canvas.getByLabelText('Rechnungssprache'),
			'it',
		)
		await userEvent.click(next())
		await expect(
			canvas.getByRole('heading', { name: 'Absender' }),
		).toHaveFocus()
		await userEvent.click(next())
		await expect(
			canvas.getByRole('heading', { name: 'Absender' }),
		).toBeVisible()
		await userEvent.type(
			canvas.getByRole('textbox', { name: 'Name' }),
			'Atelier Rossi',
		)
		await userEvent.click(canvas.getByRole('button', { name: 'Zurück' }))
		await expect(canvas.getByLabelText('Rechnungssprache')).toHaveValue('it')
		await userEvent.click(next())
		await expect(canvas.getByRole('textbox', { name: 'Name' })).toHaveValue(
			'Atelier Rossi',
		)
		await userEvent.click(next())
		const skip = canvas.getByRole('button', { name: 'Design überspringen' })
		await userEvent.click(skip)
		await expect(await canvas.findByRole('alert')).toBeVisible()
		await userEvent.click(skip)
		await expect(
			await canvas.findByRole('heading', { name: 'Einrichtung abgeschlossen' }),
		).toBeVisible()
	},
}
