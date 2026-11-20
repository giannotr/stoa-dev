import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
	FileViewer,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

const svg = (width: number, height: number, body: string) =>
	`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fbfbf9"/>${body}</svg>`,
	)}`

/** A portrait "sheet of music": staves and a few notes. */
const sheet = svg(
	800,
	1100,
	Array.from({ length: 9 }, (_, staff) => {
		const top = 120 + staff * 105
		const lines = Array.from(
			{ length: 5 },
			(_, line) =>
				`<line x1="70" x2="730" y1="${top + line * 12}" y2="${top + line * 12}" stroke="#222" stroke-width="1.4"/>`,
		).join('')
		const notes = Array.from(
			{ length: 10 },
			(_, note) =>
				`<ellipse cx="${130 + note * 60}" cy="${top + ((note * 7 + staff * 3) % 9) * 6}" rx="7" ry="5" fill="#222"/>`,
		).join('')
		return lines + notes
	}).join('') +
		'<text x="400" y="70" font-family="Georgia" font-size="34" text-anchor="middle" fill="#222">Etüde Nr. 4</text>',
)

/** A landscape fingering chart. */
const chart = svg(
	1400,
	700,
	Array.from({ length: 6 }, (_, row) =>
		Array.from(
			{ length: 12 },
			(_, column) =>
				`<circle cx="${110 + column * 108}" cy="${120 + row * 95}" r="26" fill="${(row + column) % 3 ? 'none' : '#222'}" stroke="#222" stroke-width="3"/>`,
		).join(''),
	).join(''),
)

/** A large "photo": a soft gradient with a horizon. */
const photo = svg(
	3000,
	2000,
	'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d3d8"/><stop offset="1" stop-color="#6d7a80"/></linearGradient></defs><rect width="3000" height="2000" fill="url(#g)"/><circle cx="2200" cy="620" r="180" fill="#f4f1e8"/><path d="M0 1400 Q750 1150 1500 1380 T3000 1300 V2000 H0Z" fill="#2c3336"/>',
)

/** A minimal one-page PDF, built so its xref offsets are exact. */
function pdfUrl() {
	const objects = [
		'<< /Type /Catalog /Pages 2 0 R >>',
		'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
		'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
		'',
		'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
	]
	const stream = 'BT /F1 28 Tf 72 760 Td (Uebeplan Woche 47) Tj ET'
	objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
	let body = '%PDF-1.4\n'
	const offsets: number[] = []
	objects.forEach((object, index) => {
		offsets.push(body.length)
		body += `${index + 1} 0 obj\n${object}\nendobj\n`
	})
	const xref = body.length
	body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
	for (const offset of offsets)
		body += `${String(offset).padStart(10, '0')} 00000 n \n`
	body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
	return URL.createObjectURL(new Blob([body], { type: 'application/pdf' }))
}

const files = [
	{ name: 'Etüde Nr. 4.svg', src: sheet, description: '42 KB' },
	{ name: 'Griffbild Klarinette.svg', src: chart, description: '18 KB' },
	{ name: 'Konzertsaal.jpg', src: photo, description: '2,4 MB' },
	{ name: 'Übeplan Woche 47.pdf', src: pdfUrl(), description: '1 KB' },
]

/** A collection like practicr's attachments: the app resolves the current file. */
function Collection({
	start = 0,
	onIndexChange,
	closable = false,
}: {
	start?: number
	onIndexChange?: (index: number) => void
	closable?: boolean
}) {
	const [index, setIndex] = useState(start)
	const file = files[index]
	return (
		<div className='max-w-4xl' style={{ height: '38rem' }}>
			<FileViewer
				closable={closable}
				name={file.name}
				src={file.src}
				description={file.description}
				index={index}
				count={files.length}
				onIndexChange={(next) => {
					setIndex(next)
					onIndexChange?.(next)
				}}
			/>
		</div>
	)
}

const meta = {
	title: 'UI/FileViewer',
	component: FileViewer,
	args: { name: 'Etüde Nr. 4.svg', src: sheet, description: '42 KB' },
	render: (args) => (
		<div className='max-w-4xl' style={{ height: '38rem' }}>
			<FileViewer {...args} />
		</div>
	),
} satisfies Meta<typeof FileViewer>

export default meta
type Story = StoryObj<typeof meta>

export const Image: Story = {}

export const LargeImage: Story = {
	args: { name: 'Konzertsaal.jpg', src: photo, description: '2,4 MB' },
}

/** PDFs use the webview's own viewer; the zoom scale steps aside. */
export const Pdf: Story = {
	args: {
		name: 'Übeplan Woche 47.pdf',
		src: files[3].src,
		description: '1 KB',
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByTitle('Übeplan Woche 47.pdf')).toBeInTheDocument()
		await expect(canvas.queryByRole('slider', { name: 'Zoom' })).toBeNull()
	},
}

export const Loading: Story = { args: { src: null } }

export const Unviewable: Story = {
	args: {
		name: 'Kaputt.png',
		src: 'data:image/png;base64,AAAA',
		onError: fn(),
	},
	play: async ({ args, canvas }) => {
		await canvas.findByRole('alert')
		await expect(args.onError).toHaveBeenCalled()
	},
}

export const WithFooter: Story = {
	args: {
		footer: (
			<Button variant='link' size='xs' className='h-auto gap-1 px-0'>
				<ExternalLink className='size-3' /> Im Standardprogramm öffnen
			</Button>
		),
	},
}

/** Paging through four files: dots, framed index, buttons and arrow keys. */
export const CollectionPaging: Story = {
	render: () => <Collection onIndexChange={fn()} />,
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: 'Etüde Nr. 4.svg' }),
		).toBeVisible()
		await userEvent.click(canvas.getByRole('button', { name: 'Nächste Datei' }))
		await expect(
			canvas.getByRole('heading', { name: 'Griffbild Klarinette.svg' }),
		).toBeVisible()
		await expect(canvas.getByText('02 / 04')).toBeVisible()

		canvas.getByRole('button', { name: 'Nächste Datei' }).focus()
		await userEvent.keyboard('{ArrowRight}')
		await expect(
			canvas.getByRole('heading', { name: 'Konzertsaal.jpg' }),
		).toBeVisible()

		await userEvent.click(
			canvas.getByRole('button', { name: 'Vorherige Datei' }),
		)
		await userEvent.click(
			canvas.getByRole('button', { name: 'Vorherige Datei' }),
		)
		await userEvent.click(
			canvas.getByRole('button', { name: 'Vorherige Datei' }),
		)
		await expect(
			canvas.getByRole('heading', { name: 'Übeplan Woche 47.pdf' }),
		).toBeVisible()
	},
}

/** Starts fitted; the buttons and keys step through the zoom stops. */
export const Zooming: Story = {
	play: async ({ canvas, canvasElement }) => {
		const viewer = within(canvasElement)
		const fit = canvas.getByRole('button', { name: 'Einpassen' })
		await waitFor(() =>
			expect(
				canvas.getByRole('img', { name: 'Etüde Nr. 4.svg' }),
			).toBeVisible(),
		)
		await expect(fit).toHaveAttribute('aria-pressed', 'true')

		await userEvent.click(canvas.getByRole('button', { name: 'Vergrößern' }))
		await expect(fit).toHaveAttribute('aria-pressed', 'false')
		const slider = viewer.getByRole('slider', { name: 'Zoom' })
		const zoomed = Number(
			slider.getAttribute('aria-valuetext')?.replace(/\D/g, ''),
		)
		await expect(zoomed).toBeGreaterThan(0)

		await userEvent.keyboard('{+}')
		await expect(
			Number(slider.getAttribute('aria-valuetext')?.replace(/\D/g, '')),
		).toBeGreaterThan(zoomed)

		await userEvent.keyboard('0')
		await expect(fit).toHaveAttribute('aria-pressed', 'true')
	},
}

/**
 * In a tall dialog without extra card: the viewer's own close button closes
 * the (uncontrolled) dialog, so the dialog's X is not needed.
 */
export const InDialog: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Anhang ansehen</Button>
			</DialogTrigger>
			<DialogContent
				showCloseButton={false}
				className='h-[90vh] w-[min(64rem,calc(100vw-2rem))] max-w-none border-0 bg-transparent p-0 shadow-none sm:max-w-none'
			>
				<DialogTitle className='sr-only'>Anhänge</DialogTitle>
				<Collection closable />
			</DialogContent>
		</Dialog>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			canvas.getByRole('button', { name: 'Anhang ansehen' }),
		)
		await screen.findByRole('dialog')
		await userEvent.click(screen.getByRole('button', { name: 'Nächste Datei' }))
		await userEvent.click(screen.getByRole('button', { name: 'Schließen' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	},
}

/** Standalone and without onClose, the close button hides the viewer itself. */
export const ClosableStandalone: Story = {
	args: { closable: true },
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Schließen' }))
		await expect(
			canvas.queryByRole('heading', { name: 'Etüde Nr. 4.svg' }),
		).toBeNull()
	},
}

/** With onClose the app decides; Escape closes too outside of dialogs. */
export const ClosableWithCallback: Story = {
	args: { closable: true, onClose: fn() },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Schließen' }))
		await expect(args.onClose).toHaveBeenCalledTimes(1)
		canvas.getByRole('button', { name: 'Einpassen' }).focus()
		await userEvent.keyboard('{Escape}')
		await expect(args.onClose).toHaveBeenCalledTimes(2)
	},
}
