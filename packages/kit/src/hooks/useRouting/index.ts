import { useCallback } from 'react'
import { useNavigate } from 'react-router'

/**
 * Typed navigation helper. Apps bind their own route union once:
 *
 * ```ts
 * export const useAppRouting = () => useRouting<RegisteredRoutes>('/')
 * ```
 */
export function useRouting<Route extends string = string>(
	defaultRoute = '/' as Route,
) {
	const navigate = useNavigate()

	const routeTo = useCallback(
		(route: Route, options?: { replace?: boolean }) => {
			void navigate(route, { replace: options?.replace ?? true })
		},
		[navigate],
	)

	const routeToDefault = useCallback(() => {
		routeTo(defaultRoute)
	}, [routeTo, defaultRoute])

	return { routeTo, routeToDefault }
}
