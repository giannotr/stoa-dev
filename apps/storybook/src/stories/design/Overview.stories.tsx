import {
	AppNavigation,
	AppNavigationThemeToggle,
	ConfirmDialog,
	DatePickerInput,
	NativeSelect,
	PageHeading,
} from '@stoa-dev/kit/shell'
import {
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Input,
	Label,
	Switch,
} from '@stoa-dev/kit/ui'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
	ChartPie,
	Copy,
	Download,
	EllipsisVertical,
	Home,
	Library,
	Pencil,
	Settings,
	Trash2,
	UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { fn } from 'storybook/test'

/** Small mono caption, like the corner annotations in the reference images. */
function Caption({ children }: { children: React.ReactNode }) {
	return (
		<span
			className='text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground'
			style={{ fontFamily: 'var(--instrument-mono, ui-monospace, monospace)' }}
		>
			{children}
		</span>
	)
}

/** The long dash between weekday and date, drawn as a firm rule. */
function DateRule() {
	return (
		<span
			aria-hidden='true'
			className='inline-block h-[1.5px] w-10 rounded-full bg-current'
		/>
	)
}

const week = [
	['Mo', 23],
	['Di', 17],
	['Mi', 19],
	['Do', 21],
	['Fr', 24],
	['Sa', 12],
	['So', 9],
] as const

function Screen() {
	const [date, setDate] = useState('2026-11-17')
	const now = new Date()
	const weekday = new Intl.DateTimeFormat('de', { weekday: 'short' }).format(
		now,
	)
	const day = new Intl.DateTimeFormat('de', {
		day: '2-digit',
		month: 'long',
	}).format(now)
	const max = Math.max(...week.map(([, value]) => value))

	return (
		<div className='relative min-h-screen pl-28 pr-10 pb-20'>
			<AppNavigation
				groups={[
					[
						{ path: '/', label: 'Übersicht', Icon: Home },
						{ path: '/library', label: 'Bibliothek', Icon: Library },
						{ path: '/statistics', label: 'Statistik', Icon: ChartPie },
					],
				]}
				footerGroups={[
					[
						<AppNavigationThemeToggle key='theme' onToggle={fn()} />,
						{ path: '/user', label: 'Profil', Icon: UserRound },
						{ path: '/settings', label: 'Einstellungen', Icon: Settings },
					],
				]}
			/>

			<header className='flex items-center justify-between pt-6 pb-10 text-sm font-medium'>
				<p className='flex items-center gap-4'>
					{weekday}
					<span className='sr-only'>, </span>
					<DateRule />
					{day}
				</p>
				<p className='tabular-nums'>{now.getFullYear()}</p>
			</header>

			<PageHeading>Übersicht</PageHeading>

			<div className='mt-10 grid gap-8 lg:grid-cols-3'>
				<Card>
					<CardHeader>
						<CardTitle>Übezeit heute</CardTitle>
						<CardDescription>Stunden und Minuten</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-6'>
						<p className='text-7xl font-extralight tracking-tight tabular-nums'>
							01:45
							<span className='ml-2 align-top text-sm font-normal text-muted-foreground'>
								H
							</span>
						</p>
						<div className='flex items-center justify-between'>
							<Caption>Ziel 02:00</Caption>
							<Caption>87 %</Caption>
						</div>
						<div className='h-px bg-border'>
							<div className='h-px w-[87%] bg-foreground' />
						</div>
					</CardContent>
				</Card>

				<Card className='lg:col-span-2'>
					<CardHeader>
						<div className='grid gap-1'>
							<CardTitle>Diese Woche</CardTitle>
							<CardDescription>Minuten pro Tag</CardDescription>
						</div>
						<CardAction>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant='ghost'
										size='icon'
										aria-label='Weitere Aktionen'
									>
										<EllipsisVertical />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='end'>
									<DropdownMenuLabel>Woche</DropdownMenuLabel>
									<DropdownMenuItem>
										<Pencil /> Ziele bearbeiten
										<DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Copy /> Woche duplizieren
									</DropdownMenuItem>
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<Download /> Exportieren als
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent>
											<DropdownMenuItem>PDF</DropdownMenuItem>
											<DropdownMenuItem>CSV</DropdownMenuItem>
										</DropdownMenuSubContent>
									</DropdownMenuSub>
									<DropdownMenuSeparator />
									<DropdownMenuItem variant='destructive'>
										<Trash2 /> Woche zurücksetzen
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</CardAction>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-7 items-end gap-4'>
							{week.map(([label, value]) => (
								<div key={label} className='grid justify-items-center gap-2'>
									<div className='flex h-28 items-end'>
										<div
											className='w-1.5 rounded-full bg-foreground'
											style={{ height: `${(value / max) * 100}%` }}
										/>
									</div>
									<span className='text-xl font-light tabular-nums'>
										{value}
									</span>
									<Caption>{label}</Caption>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className='lg:col-span-2'>
					<CardHeader>
						<CardTitle>Eintrag</CardTitle>
						<CardDescription>Formularfelder im Zusammenspiel.</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-6 sm:grid-cols-2'>
						<div className='grid gap-2'>
							<Label htmlFor='ov-title'>Stück</Label>
							<Input
								id='ov-title'
								placeholder='Titel'
								defaultValue='Etüde Nr. 4'
							/>
						</div>
						<div className='grid gap-2'>
							<Label htmlFor='ov-type'>Art</Label>
							<NativeSelect id='ov-type' defaultValue='practice'>
								<option value='practice'>Übung</option>
								<option value='lesson'>Unterricht</option>
							</NativeSelect>
						</div>
						<DatePickerInput
							id='ov-date'
							label='Datum'
							value={date}
							onChange={setDate}
						/>
						<div className='flex items-end gap-3 pb-3'>
							<Switch id='ov-remind' defaultChecked />
							<Label htmlFor='ov-remind'>Erinnern</Label>
						</div>
						<div className='flex flex-wrap gap-3 sm:col-span-2'>
							<Button>Speichern</Button>
							<Button variant='outline'>Entwurf</Button>
							<ConfirmDialog
								title='Eintrag löschen?'
								description='Der Eintrag wird endgültig entfernt.'
								confirmLabel='Löschen'
								variant='destructive'
								onConfirm={fn()}
								trigger={<Button variant='destructive'>Löschen</Button>}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Repertoire</CardTitle>
						<CardDescription>Stücke nach Status</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-4'>
						{[
							['In Arbeit', 12, 60],
							['Geplant', 7, 35],
							['Abgeschlossen', 31, 100],
						].map(([label, count, share]) => (
							<div key={label} className='grid gap-2'>
								<div className='flex items-baseline justify-between'>
									<Caption>{label}</Caption>
									<span className='text-2xl font-light tabular-nums'>
										{count}
									</span>
								</div>
								<div className='h-px bg-border'>
									<div
										className='h-px bg-foreground'
										style={{ width: `${share}%` }}
									/>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<footer className='absolute right-10 bottom-6 left-28 flex items-center justify-between'>
				<span className='border border-foreground px-2 py-1 font-mono text-xs tabular-nums'>
					013
				</span>
				<Caption>stoa kit</Caption>
			</footer>
		</div>
	)
}

/**
 * A whole screen built only from kit components. Switch "Design" in the
 * toolbar to compare Classic and Instrument.
 */
const meta = {
	title: 'Design/Overview',
	render: () => <Screen />,
	parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Screen_: Story = { name: 'App-Bildschirm' }
