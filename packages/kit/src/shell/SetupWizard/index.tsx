import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader } from '../../ui/card'
import { cn } from '../../utils/cn'

export interface SetupWizardStep {
	id: string
	title: string
	description?: string
	/** Only the active step is mounted. Keep field values in the calling app. */
	content: ReactNode
	submitLabel?: string
}

export interface SetupWizardProps {
	steps: readonly SetupWizardStep[]
	title: string
	appName?: string
	description?: string
	notice?: ReactNode
	footer?: ReactNode
	className?: string
	/** Persist the setup. Reject to show the error and allow a retry. */
	onComplete: () => void | Promise<void>
	errorMessage?: string
}

export function SetupWizard({
	steps,
	title,
	appName,
	description,
	notice,
	footer,
	className,
	onComplete,
	errorMessage,
}: SetupWizardProps) {
	const { t } = useTranslation(STOA_NS)
	const [stepIndex, setStepIndex] = useState(0)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState(false)
	const saveInFlight = useRef(false)
	const headingRef = useRef<HTMLHeadingElement>(null)
	const index = Math.min(stepIndex, steps.length - 1)
	const step = steps[index]
	const stepId = step?.id
	const finalStep = index === steps.length - 1

	// biome-ignore lint/correctness/useExhaustiveDependencies: Refocus when the displayed step changes.
	useEffect(() => {
		headingRef.current?.focus()
	}, [stepId])

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (saveInFlight.current) return
		setError(false)

		if (!finalStep) {
			setStepIndex(index + 1)
			return
		}

		saveInFlight.current = true
		setSaving(true)
		try {
			await onComplete()
		} catch {
			setError(true)
		} finally {
			saveInFlight.current = false
			setSaving(false)
		}
	}

	if (!step) return null

	return (
		<div
			data-slot='setup-wizard'
			className={cn('relative bg-background px-4 py-8 sm:px-8', className)}
		>
			<div className='mx-auto grid w-full max-w-2xl gap-6'>
				{notice}
				<header className='text-center'>
					{appName && (
						<p className='mb-2 text-sm font-medium tracking-widest uppercase'>
							{appName}
						</p>
					)}
					<h1 className='text-3xl font-semibold'>{title}</h1>
					{description && (
						<p className='mt-2 text-xs text-muted-foreground'>{description}</p>
					)}
				</header>

				<ol
					aria-label={t('setupWizard.progress')}
					className='flex flex-wrap justify-center gap-3 sm:gap-2'
				>
					{steps.map(({ id, title }, position) => (
						<li
							key={id}
							aria-current={position === index ? 'step' : undefined}
							className='grid w-24 justify-items-center gap-2 text-center sm:min-w-0 sm:flex-1'
						>
							<span
								aria-hidden='true'
								className={cn(
									'flex size-8 items-center justify-center rounded-full text-sm font-medium',
									position <= index
										? 'bg-primary text-primary-foreground'
										: 'border bg-card text-muted-foreground',
								)}
							>
								{position < index ? <Check className='size-4' /> : position + 1}
							</span>
							<span
								className={cn(
									'w-full text-xs [overflow-wrap:anywhere]',
									position === index
										? 'font-semibold'
										: 'text-muted-foreground',
								)}
							>
								{title}
							</span>
						</li>
					))}
				</ol>

				<Card>
					<CardHeader>
						<p className='text-xs text-muted-foreground'>
							{t('setupWizard.step', {
								current: index + 1,
								total: steps.length,
							})}
						</p>
						<h2
							ref={headingRef}
							tabIndex={-1}
							className='text-xl font-semibold outline-none'
						>
							{step.title}
						</h2>
						{step.description && (
							<p className='text-xs text-muted-foreground'>
								{step.description}
							</p>
						)}
					</CardHeader>
					<CardContent>
						<form onSubmit={submit} aria-busy={saving || undefined}>
							<fieldset disabled={saving} className='grid gap-5'>
								<div key={step.id} className='grid gap-4'>
									{step.content}
								</div>

								{error && (
									<p role='alert' className='text-sm text-destructive'>
										{errorMessage ?? t('setupWizard.saveError')}
									</p>
								)}

								<div className='mt-1 flex flex-wrap justify-between gap-3 border-t pt-5'>
									<Button
										type='button'
										variant='outline'
										disabled={index === 0 || saving}
										onClick={() => {
											setError(false)
											setStepIndex(index - 1)
										}}
									>
										<ArrowLeft aria-hidden='true' />
										{t('setupWizard.back')}
									</Button>
									<Button
										type='submit'
										disabled={saving}
										className='h-auto min-h-12 whitespace-normal py-2'
									>
										{saving ? (
											<LoaderCircle
												className='motion-safe:animate-spin'
												aria-hidden='true'
											/>
										) : null}
										{saving
											? t('setupWizard.saving')
											: (step.submitLabel ??
												t(
													finalStep ? 'setupWizard.finish' : 'setupWizard.next',
												))}
										{!saving && <ArrowRight aria-hidden='true' />}
									</Button>
								</div>
							</fieldset>
						</form>
					</CardContent>
				</Card>
				{footer && (
					<div className='text-center text-xs text-muted-foreground'>
						{footer}
					</div>
				)}
			</div>
		</div>
	)
}
