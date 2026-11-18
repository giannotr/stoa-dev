import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useState,
} from 'react'
import {
	StartupAnimation,
	type StartupAnimationProps,
	type StartupPhase,
} from '../StartupAnimation'

type StartupContextValue = {
	finished: boolean
	setPhase: Dispatch<SetStateAction<StartupPhase>>
	setReady: Dispatch<SetStateAction<boolean>>
	finish: () => void
	beginDataLoading: () => void
}

const StartupContext = createContext<StartupContextValue | null>(null)

export interface StartupProviderProps {
	children: ReactNode
	/** Everything the overlay shows: name, logo, setting names, messages. */
	animation: Omit<StartupAnimationProps, 'ready' | 'phase' | 'onComplete'>
}

/**
 * Shows the startup overlay above the app until `finish()` is called or the
 * data reports ready. Phases: license → settings → app.
 */
export function StartupProvider({ children, animation }: StartupProviderProps) {
	const [phase, setPhase] = useState<StartupPhase>('license')
	const [ready, setReady] = useState(false)
	const [finished, setFinished] = useState(false)
	const finish = useCallback(() => setFinished(true), [])
	const beginDataLoading = useCallback(() => {
		setPhase('settings')
		setReady(false)
		setFinished(false)
	}, [])

	return (
		<StartupContext.Provider
			value={{ finished, setPhase, setReady, finish, beginDataLoading }}
		>
			{children}
			{!finished && (
				<div className='fixed inset-0 z-100'>
					<StartupAnimation
						{...animation}
						ready={ready}
						phase={phase}
						onComplete={finish}
					/>
				</div>
			)}
		</StartupContext.Provider>
	)
}

export function useStartup() {
	const context = useContext(StartupContext)
	if (!context) throw new Error('StartupProvider is missing')
	return context
}
