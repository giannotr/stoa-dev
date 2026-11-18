import { createAutosave } from '@stoa-dev/kit/autosave'
import { SaveStatus } from '@stoa-dev/kit/shell'
import { Button, Input, Label } from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { StrictMode, useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'

const { AutosaveProvider, useAutosave } = createAutosave<{ title: string }>()

function Editor() {
	const { value, setValue, status, dirty, flush, retry } = useAutosave()
	return (
		<div className='grid max-w-md gap-4'>
			<Label htmlFor='autosave-title'>Titel</Label>
			<Input
				id='autosave-title'
				value={value.title}
				onChange={(event) => {
					setValue({ title: event.target.value })
				}}
			/>
			<p data-testid='dirty'>{dirty ? 'Ungespeichert' : 'Gespeichert'}</p>
			<Button
				disabled={!dirty || status === 'saving'}
				onClick={() => {
					void flush().catch(() => {})
				}}
			>
				Jetzt speichern
			</Button>
			<SaveStatus
				floating={false}
				status={
					status === 'saving' || status === 'saved' || status === 'error'
						? status
						: null
				}
				onRetry={() => {
					void retry().catch(() => {})
				}}
			/>
		</div>
	)
}

function Demo({
	failOnce = false,
	autoSave = true,
}: {
	failOnce?: boolean
	autoSave?: boolean
}) {
	const [stored, setStored] = useState('Geladener Titel')
	const [adapter] = useState(() => {
		let fail = failOnce
		return async (value: { title: string }) => {
			await new Promise((resolve) => setTimeout(resolve, 50))
			if (fail) {
				fail = false
				throw new Error('Disk full')
			}
			setStored(value.title)
		}
	})
	return (
		<StrictMode>
			<AutosaveProvider
				initialValue={{ title: 'Geladener Titel' }}
				save={adapter}
				autoSave={autoSave}
				debounceMs={100}
			>
				<Editor />
			</AutosaveProvider>
			<p className='mt-6'>
				Auf Datenträger: <span data-testid='stored'>{stored}</span>
			</p>
		</StrictMode>
	)
}

const meta = { title: 'Autosave/Provider', component: Demo } satisfies Meta<
	typeof Demo
>
export default meta
type Story = StoryObj<typeof meta>

export const Automatic: Story = {
	play: async ({ canvas }) => {
		await userEvent.clear(canvas.getByRole('textbox'))
		await userEvent.type(canvas.getByRole('textbox'), 'Neuer Titel')
		await waitFor(() =>
			expect(canvas.getByTestId('stored')).toHaveTextContent('Neuer Titel'),
		)
		await expect(canvas.getByTestId('dirty')).toHaveTextContent('Gespeichert')
	},
}

export const Manual: Story = {
	args: { autoSave: false },
	play: async ({ canvas }) => {
		await userEvent.clear(canvas.getByRole('textbox'))
		await userEvent.type(canvas.getByRole('textbox'), 'Manuell')
		await expect(canvas.getByTestId('stored')).toHaveTextContent(
			'Geladener Titel',
		)
		await userEvent.click(
			canvas.getByRole('button', { name: 'Jetzt speichern' }),
		)
		await waitFor(() =>
			expect(canvas.getByTestId('stored')).toHaveTextContent('Manuell'),
		)
	},
}

export const RetryAfterFailure: Story = {
	args: { failOnce: true, autoSave: false },
	play: async ({ canvas }) => {
		await userEvent.clear(canvas.getByRole('textbox'))
		await userEvent.type(canvas.getByRole('textbox'), 'Erhaltener Entwurf')
		await userEvent.click(
			canvas.getByRole('button', { name: 'Jetzt speichern' }),
		)
		await waitFor(() => expect(canvas.getByRole('alert')).toBeVisible())
		await expect(canvas.getByTestId('dirty')).toHaveTextContent('Ungespeichert')
		await userEvent.click(
			canvas.getByRole('button', { name: 'Erneut versuchen' }),
		)
		await waitFor(() =>
			expect(canvas.getByTestId('stored')).toHaveTextContent(
				'Erhaltener Entwurf',
			),
		)
	},
}
