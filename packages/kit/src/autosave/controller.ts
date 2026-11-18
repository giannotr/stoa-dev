export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface AutosaveOptions<T> {
	initialValue: T
	save: (value: T) => Promise<void>
	/** Disables all writes, including flush/retry. Pending edits are retained. */
	enabled?: boolean
	/** Disable automatic writes while keeping manual flush available. */
	autoSave?: boolean
	debounceMs?: number
	maxWaitMs?: number
}

export interface AutosaveSnapshot<T> {
	value: T
	status: AutosaveStatus
	dirty: boolean
	error: unknown
	editRevision: number
	successfulSaves: number
}

/** One immutable document, one writer. No I/O is performed by the constructor. */
export class AutosaveController<T> {
	private options: AutosaveOptions<T>
	private snapshot: AutosaveSnapshot<T>
	private savedRevision = 0
	private listeners = new Set<() => void>()
	private timer?: ReturnType<typeof setTimeout>
	private firstEditAt?: number
	private operation?: Promise<void>
	private active = false

	constructor(options: AutosaveOptions<T>) {
		this.options = options
		this.snapshot = {
			value: options.initialValue,
			status: 'idle',
			dirty: false,
			error: null,
			editRevision: 0,
			successfulSaves: 0,
		}
	}

	getSnapshot = () => this.snapshot
	subscribe = (listener: () => void) => {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
	private publish(patch: Partial<AutosaveSnapshot<T>>) {
		this.snapshot = { ...this.snapshot, ...patch }
		for (const listener of this.listeners) listener()
	}
	configure(options: Omit<AutosaveOptions<T>, 'initialValue'>) {
		this.options = { ...this.options, ...options }
		this.schedule()
	}
	/** Safe to stop/start again during React StrictMode's effect replay. */
	start = () => {
		this.active = true
		this.schedule()
	}
	stop = () => {
		this.active = false
		clearTimeout(this.timer)
	}

	setValue = (update: T | ((previous: T) => T)) => {
		const value =
			typeof update === 'function'
				? (update as (previous: T) => T)(this.snapshot.value)
				: update
		if (Object.is(value, this.snapshot.value)) return
		this.firstEditAt ??= Date.now()
		this.publish({
			value,
			editRevision: this.snapshot.editRevision + 1,
			dirty: true,
			status: this.operation ? 'saving' : 'pending',
			error: null,
		})
		this.schedule()
	}

	private schedule() {
		clearTimeout(this.timer)
		if (
			!this.active ||
			this.options.enabled === false ||
			this.options.autoSave === false ||
			!this.snapshot.dirty ||
			this.operation ||
			this.snapshot.status === 'error'
		)
			return
		const debounce = Math.max(0, this.options.debounceMs ?? 600)
		const remaining = Math.max(
			0,
			(this.options.maxWaitMs ?? 5000) -
				(Date.now() - (this.firstEditAt ?? Date.now())),
		)
		this.timer = setTimeout(
			() => {
				void this.flush().catch(() => {})
			},
			Math.min(debounce, remaining),
		)
	}

	/** Drains edits made during a write too. Concurrent callers share one promise. */
	flush = (): Promise<void> => {
		clearTimeout(this.timer)
		if (this.operation) return this.operation
		if (!this.snapshot.dirty) return Promise.resolve()
		// Start on a microtask so synchronous save errors cannot leave a stuck operation.
		const operation = Promise.resolve()
			.then(async () => {
				while (this.snapshot.dirty) {
					if (this.options.enabled === false)
						throw new Error('Autosave writes are disabled')
					const { value, editRevision } = this.snapshot
					this.publish({ status: 'saving', error: null })
					await this.options.save(value)
					this.savedRevision = editRevision
					const dirty = this.snapshot.editRevision !== this.savedRevision
					this.publish({
						dirty,
						successfulSaves: this.snapshot.successfulSaves + 1,
						status: dirty ? 'saving' : 'saved',
					})
				}
				this.firstEditAt = undefined
			})
			.catch((error: unknown) => {
				this.publish({ status: 'error', error })
				throw error
			})
			.finally(() => {
				this.operation = undefined
				this.schedule()
			})
		this.operation = operation
		return operation
	}
	retry = () => this.flush()
}
