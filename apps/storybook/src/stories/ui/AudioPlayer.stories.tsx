import {
	AudioPlayer,
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExternalLink } from 'lucide-react'
import { expect, fn, userEvent, waitFor } from 'storybook/test'

/** A quiet 440 Hz tone as WAV, generated in the browser so no file is needed. */
function toneUrl(seconds = 12) {
	const rate = 8000
	const samples = rate * seconds
	const buffer = new ArrayBuffer(44 + samples * 2)
	const view = new DataView(buffer)
	const text = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i += 1)
			view.setUint8(offset + i, value.charCodeAt(i))
	}
	text(0, 'RIFF')
	view.setUint32(4, 36 + samples * 2, true)
	text(8, 'WAVEfmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, 1, true)
	view.setUint32(24, rate, true)
	view.setUint32(28, rate * 2, true)
	view.setUint16(32, 2, true)
	view.setUint16(34, 16, true)
	text(36, 'data')
	view.setUint32(40, samples * 2, true)
	for (let i = 0; i < samples; i += 1)
		view.setInt16(
			44 + i * 2,
			Math.sin((2 * Math.PI * 440 * i) / rate) * 2000,
			true,
		)
	return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

const src = toneUrl()

const meta = {
	title: 'UI/AudioPlayer',
	component: AudioPlayer,
	args: {
		src,
		title: 'Etüde Nr. 4 – Aufnahme.wav',
		description: 'Audiodatei · 188 KB',
	},
} satisfies Meta<typeof AudioPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Without a title the heading reads "Audio instrument". */
export const Untitled: Story = {
	args: { title: undefined, description: undefined },
}

/** `src={null}` while the app is still resolving the file. */
export const Loading: Story = { args: { src: null } }

export const Unplayable: Story = {
	args: { src: 'data:audio/wav;base64,AAAA', onError: fn() },
	play: async ({ args, canvas }) => {
		await canvas.findByRole('alert')
		await expect(args.onError).toHaveBeenCalled()
	},
}

/** Footer slot for app actions, e.g. opening the file in the default app. */
export const WithFooter: Story = {
	args: {
		footer: (
			<Button variant='link' size='xs' className='h-auto gap-1 px-0'>
				<ExternalLink className='size-3' /> Im Standardprogramm öffnen
			</Button>
		),
	},
}

/** How practicr uses it: inside a dialog, the play button gets the focus. */
export const InDialog: Story = {
	render: (args) => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Aufnahme abspielen</Button>
			</DialogTrigger>
			<DialogContent className='w-auto border-0 bg-transparent p-0 shadow-none sm:max-w-none'>
				<DialogTitle className='sr-only'>{args.title}</DialogTitle>
				<AudioPlayer {...args} autoFocus />
			</DialogContent>
		</Dialog>
	),
}

/** Reads the duration, seeks with buttons and arrow keys, sets speed and repeat. */
export const Controls: Story = {
	play: async ({ canvas, canvasElement }) => {
		await waitFor(
			() =>
				expect(
					canvas.getByRole('slider', { name: 'Position' }),
				).toHaveAttribute('aria-valuetext', '0:00 / 0:12'),
			{ timeout: 5000 },
		)
		const player = canvasElement.querySelector('[data-slot="audio-player"]')
		const time = () =>
			player?.querySelector('[data-slot="audio-player-time"]') as HTMLElement

		await userEvent.click(canvas.getByRole('button', { name: '5 s vor' }))
		await expect(time()).toHaveTextContent('0:05')

		// Arrow keys skip by 5 s anywhere in the player except inside the slider.
		canvas.getByRole('button', { name: 'Abspielen' }).focus()
		await userEvent.keyboard('{ArrowRight}')
		await expect(time()).toHaveTextContent('0:10')
		await expect(canvas.getByText('Rest −0:02')).toBeVisible()
		await expect(
			canvas.getByRole('slider', { name: 'Position' }),
		).toHaveAttribute('aria-valuetext', '0:10 / 0:12')

		await userEvent.click(canvas.getByRole('button', { name: '5 s zurück' }))
		await expect(time()).toHaveTextContent('0:05')
		const speed = canvas.getByRole('button', { name: '0,75×' })
		await userEvent.click(speed)
		await expect(speed).toHaveAttribute('aria-pressed', 'true')
		const repeat = canvas.getByRole('button', { name: 'Wiederholen' })
		await userEvent.click(repeat)
		await expect(repeat).toHaveAttribute('aria-pressed', 'true')
	},
}

export const PlayAndPause: Story = {
	play: async ({ canvas }) => {
		await waitFor(
			() =>
				expect(
					canvas.getByRole('slider', { name: 'Position' }),
				).toHaveAttribute('aria-valuetext', '0:00 / 0:12'),
			{ timeout: 5000 },
		)
		await userEvent.click(canvas.getByRole('button', { name: 'Abspielen' }))
		const pause = await canvas.findByRole('button', { name: 'Pause' })
		await userEvent.click(pause)
		await canvas.findByRole('button', { name: 'Abspielen' })
	},
}
