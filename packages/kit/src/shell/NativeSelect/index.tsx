import { cn } from '../../utils/cn'

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function NativeSelect({
	className,
	children,
	...props
}: NativeSelectProps) {
	return (
		<select
			data-slot='native-select'
			className={cn(
				'h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}
		>
			{children}
		</select>
	)
}
