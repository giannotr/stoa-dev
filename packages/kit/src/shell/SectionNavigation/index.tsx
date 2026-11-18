import { SubNavigation, type SubNavigationProps } from '../SubNavigation'

export type SectionNavigationProps = Omit<
	SubNavigationProps,
	'floating' | 'className'
>

/** @deprecated Use SubNavigation with the floating prop. */
export function SectionNavigation(props: SectionNavigationProps) {
	return <SubNavigation {...props} floating />
}
