import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { BrandLines } from '../BrandLines'
import styles from './PageHeading.module.scss'

export interface PageHeadingProps {
	children: ReactNode
	className?: string
	/** Hide the brand accent in front of the heading. */
	plain?: boolean
}

export function PageHeading({ children, className, plain }: PageHeadingProps) {
	return (
		<h2
			data-slot='page-heading'
			className={cn(styles.pageHeading, 'shrink-0', className)}
		>
			{!plain && <BrandLines />}
			{children}
		</h2>
	)
}
