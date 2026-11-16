import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { cn } from '../../utils/cn'
import { BrandLines } from '../BrandLines'

export interface SpinnerProps {
	label?: string
	className?: string
}

export function Spinner({ label, className }: SpinnerProps) {
	const { t } = useTranslation(STOA_NS)
	return (
		<span role='status' className={cn('inline-flex items-center', className)}>
			<BrandLines loading />
			<span className='sr-only'>{label ?? t('app.loadingApp')}</span>
		</span>
	)
}
