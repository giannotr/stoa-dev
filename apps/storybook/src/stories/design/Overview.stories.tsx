import {
	BarChart,
	BarChartItem,
	Marginalia,
	MarginaliaFramed,
	MarginaliaPair,
	ProgressBar,
	TimeMeasured,
} from '@stoa-dev/kit/display'
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
import { useGlobals } from 'storybook/preview-api'
import { fn } from 'storybook/test'
import styles from './Overview.module.css'

const week = [
	['Mo', 23],
	['Di', 17],
	['Mi', 19],
	['Do', 21],
	['Fr', 24],
	['Sa', 12],
	['So', 9],
] as const

function Screen({
	theme,
	onThemeChange,
}: {
	theme: 'light' | 'dark'
	onThemeChange: (theme: 'light' | 'dark') => void
}) {
	const [date, setDate] = useState('2026-11-17')
	const now = new Date()
	const weekday = new Intl.DateTimeFormat('de', { weekday: 'short' }).format(
		now,
	)
	const day = new Intl.DateTimeFormat('de', {
		day: '2-digit',
		month: 'long',
	}).format(now)

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
						<AppNavigationThemeToggle
							key='theme'
							theme={theme}
							onToggle={onThemeChange}
						/>,
						{ path: '/user', label: 'Profil', Icon: UserRound },
						{ path: '/settings', label: 'Einstellungen', Icon: Settings },
					],
				]}
			/>

			<header className='flex items-center justify-between pt-6 pb-10'>
				<MarginaliaPair left={weekday} right={day} />
				<Marginalia value={now.getFullYear()} />
			</header>

			<PageHeading>Übersicht</PageHeading>

			<div className='mt-10 grid gap-8 lg:grid-cols-3'>
				<Card>
					<CardHeader>
						<CardTitle>Übezeit heute</CardTitle>
						<CardDescription>Stunden und Minuten</CardDescription>
					</CardHeader>
					<CardContent className='grid gap-6'>
						<TimeMeasured hours={1} minutes={45} />
						<ProgressBar label='Ziel 02:00' progress={0.87} />
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
						<BarChart label='Minuten pro Tag'>
							{week.map(([label, value]) => (
								<BarChartItem key={label} label={label} value={value} />
							))}
						</BarChart>
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
						<ProgressBar label='In Arbeit' value={12} progress={0.6} />
						<ProgressBar label='Geplant' value={7} total={21} />
						<ProgressBar label='Abgeschlossen' value={31} completed />
					</CardContent>
				</Card>
			</div>

			<footer className='absolute right-10 bottom-6 left-28 flex items-center justify-between'>
				<MarginaliaFramed value='013' />
				<Marginalia value='stoa kit' className='text-muted-foreground' />
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
	render: () => {
		const [{ theme }, updateGlobals] = useGlobals()
		return (
			<Screen
				theme={theme === 'dark' ? 'dark' : 'light'}
				onThemeChange={(nextTheme) => updateGlobals({ theme: nextTheme })}
			/>
		)
	},
	parameters: { layout: 'fullscreen', canvasClassName: styles.canvas },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Screen_: Story = { name: 'App-Bildschirm' }
