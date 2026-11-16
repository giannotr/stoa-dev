import i18next from 'i18next'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'

export interface ErrorBoundaryProps {
	children: ReactNode
	/** Custom fallback; receives a reset callback that reloads the window by default. */
	fallback?: (reset: () => void) => ReactNode
	onError?: (error: Error, info: ErrorInfo) => void
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	{ failed: boolean }
> {
	state = { failed: false }

	static getDerivedStateFromError() {
		return { failed: true }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('UI rendering failed', error, info.componentStack)
		this.props.onError?.(error, info)
	}

	render() {
		if (!this.state.failed) return this.props.children
		const reset = () => window.location.reload()
		if (this.props.fallback) return this.props.fallback(reset)
		const t = (key: string) => i18next.t(key, { ns: STOA_NS })
		return (
			<section role='alert' className='grid gap-4 rounded-xl bg-card p-6'>
				<h2 className='text-xl font-semibold'>{t('app.errorTitle')}</h2>
				<p>{t('app.errorDescription')}</p>
				<Button onClick={reset}>{t('app.restart')}</Button>
			</section>
		)
	}
}
