import { cn } from '../../utils/cn'
import styles from './BrandLines.module.scss'

export interface BrandLinesProps {
	loading?: boolean
	className?: string
}

export function BrandLines({ loading = false, className }: BrandLinesProps) {
	return (
		<span
			aria-hidden='true'
			className={cn(
				styles.brandLines,
				loading && styles.brandLinesLoading,
				className,
			)}
		>
			<i />
			<i />
			<i />
		</span>
	)
}
