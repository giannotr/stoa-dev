import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from 'react'
import { AutosaveController, type AutosaveOptions } from './controller'

/** Create once at module scope to keep each document's context fully typed. */
export function createAutosave<T>() {
	const Context = createContext<AutosaveController<T> | null>(null)
	function AutosaveProvider({
		children,
		initialValue,
		save,
		enabled = true,
		autoSave = true,
		debounceMs = 600,
		maxWaitMs = 5000,
	}: AutosaveOptions<T> & { children: ReactNode }) {
		const [controller] = useState(
			() =>
				new AutosaveController({
					initialValue,
					save,
					enabled,
					autoSave,
					debounceMs,
					maxWaitMs,
				}),
		)
		useEffect(() => {
			controller.configure({ save, enabled, autoSave, debounceMs, maxWaitMs })
		}, [controller, save, enabled, autoSave, debounceMs, maxWaitMs])
		useEffect(() => {
			controller.start()
			return controller.stop
		}, [controller])
		return <Context.Provider value={controller}>{children}</Context.Provider>
	}
	function useAutosave() {
		const controller = useContext(Context)
		if (!controller) throw new Error('AutosaveProvider is missing')
		const snapshot = useSyncExternalStore(
			controller.subscribe,
			controller.getSnapshot,
			controller.getSnapshot,
		)
		return {
			...snapshot,
			setValue: controller.setValue,
			flush: controller.flush,
			retry: controller.retry,
		}
	}
	return { AutosaveProvider, useAutosave }
}
