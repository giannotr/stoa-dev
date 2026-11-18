import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useRouting } from '../../hooks/useRouting'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'

export interface BackButtonProps {
	/** Route to return to. Defaults to `/`. */
	strict?: boolean
	to?: string
	label?: string
}

export function BackButton({ strict = false, to = '/', label }: BackButtonProps) {
	const navigate = useNavigate()
	const { routeToDefault } = useRouting(to)
	const { t } = useTranslation(STOA_NS)

	return (
		<Button
			variant='ghost'
			size='icon'
			aria-label={label ?? t('app.back')}
			onClick={() => strict ? navigate(-1) : routeToDefault}
		>
			<ArrowLeft />
		</Button>
	)
}
