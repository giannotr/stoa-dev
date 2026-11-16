import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouting } from '../../hooks/useRouting'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'

export interface BackHomeButtonProps {
	/** Route to return to. Defaults to `/`. */
	to?: string
	label?: string
}

export function BackHomeButton({ to = '/', label }: BackHomeButtonProps) {
	const { routeToDefault } = useRouting(to)
	const { t } = useTranslation(STOA_NS)
	return (
		<Button
			variant='ghost'
			size='icon'
			aria-label={label ?? t('app.back')}
			onClick={routeToDefault}
		>
			<ArrowLeft />
		</Button>
	)
}
