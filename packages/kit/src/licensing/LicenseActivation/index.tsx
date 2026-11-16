import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { activateLicense, type LicenseState, licenseErrorMessage } from '../api'
import { useLicense } from '../LicenseProvider'

interface LicenseActivationProps {
	onActivated: (state: LicenseState) => void
	replacement?: boolean
}

export function LicenseActivation({
	onActivated,
	replacement = false,
}: LicenseActivationProps) {
	const { change } = useLicense()
	const { t } = useTranslation(STOA_NS)
	const [code, setCode] = useState<string>('')
	const [deviceName, setDeviceName] = useState<string>('')
	const [pending, setPending] = useState<boolean>(false)
	const [errorCause, setError] = useState<unknown>(null)
	const error = errorCause === null ? '' : licenseErrorMessage(errorCause, t)

	async function handleSubmit(event: React.SubmitEvent) {
		event.preventDefault()
		setError(null)
		setPending(true)

		try {
			const result = await (replacement ? change : activateLicense)(
				code.trim(),
				deviceName.trim() || t('licensing.activation.defaultDeviceName'),
			)

			setCode('')
			onActivated(result)
		} catch (error) {
			setError(error)
		} finally {
			setPending(false)
		}
	}

	return (
		<div
			className={
				replacement ? 'space-y-6' : 'mx-auto w-full max-w-md space-y-6 p-8'
			}
		>
			<div>
				<h2 className='text-2xl font-semibold'>
					{replacement
						? t('licensing.activation.renew')
						: t('licensing.activation.title')}
				</h2>
				<p className='mt-2 text-sm text-neutral-500'>
					{replacement
						? t('licensing.activation.replacementDescription')
						: t('licensing.activation.description')}
				</p>
			</div>

			<form onSubmit={handleSubmit} className='space-y-5' aria-busy={pending}>
				<div>
					<Label
						htmlFor='activation-code'
						className='mb-2 block text-sm font-medium'
					>
						{t('licensing.activation.code')}
					</Label>

					<Input
						id='activation-code'
						autoFocus
						required
						value={code}
						onChange={(e) => setCode(e.target.value.toUpperCase())}
						placeholder='XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XX'
						autoComplete='off'
						spellCheck={false}
						className='w-full rounded-lg border px-4 py-3 font-mono tracking-wider'
					/>
				</div>

				<div>
					<Label
						htmlFor='activation-device-name'
						className='mb-2 block text-sm font-medium'
					>
						{t('licensing.activation.deviceName')}
					</Label>
					<Input
						id='activation-device-name'
						value={deviceName}
						maxLength={120}
						onChange={(e) => setDeviceName(e.target.value)}
						placeholder={t('licensing.activation.devicePlaceholder')}
						className='w-full rounded-lg border px-4 py-3'
					/>
				</div>

				{error && (
					<p role='alert' className='text-sm text-red-600'>
						{error}
					</p>
				)}

				<button
					type='submit'
					disabled={pending}
					className='w-full rounded-lg bg-neutral-900 px-5 py-3 font-medium text-white disabled:opacity-50'
				>
					{pending
						? t('licensing.activation.pending')
						: replacement
							? t('licensing.activation.renew')
							: t('licensing.activation.submit')}
				</button>
			</form>
		</div>
	)
}
