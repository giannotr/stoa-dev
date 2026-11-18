export type VisibleSaveStatus = 'saving' | 'saved' | 'error' | null

/** What an autosave controller exposes to the feedback timing. */
export type FeedbackSource = {
	readonly status: string
	readonly dirty: boolean
	/** Increments on every edit. */
	readonly editRevision: number
	/** Increments on every successful save. */
	readonly successfulSaves: number
}

/**
 * Decides when autosave feedback is shown: errors at once, "saving" only while
 * leaving, "saved" only after a quiet minute so typing never flickers.
 * Presentation timing only; never delays validation, persistence or navigation.
 */
export class SaveFeedback {
	private edits: number
	private successes: number
	private pending = false
	private quiet = false
	private leaving = false
	private timer?: ReturnType<typeof setTimeout>
	private hideTimer?: ReturnType<typeof setTimeout>
	private visible: VisibleSaveStatus = null
	constructor(
		private sources: FeedbackSource[],
		private notify: (status: VisibleSaveStatus) => void,
	) {
		this.edits = this.editCount()
		this.successes = this.successCount()
	}
	private editCount() {
		return this.sources.reduce((sum, source) => sum + source.editRevision, 0)
	}
	private successCount() {
		return this.sources.reduce((sum, source) => sum + source.successfulSaves, 0)
	}
	private show(status: VisibleSaveStatus) {
		if (status === this.visible) return
		this.visible = status
		this.notify(status)
	}
	setLeaving(value: boolean) {
		this.leaving = value
		this.update()
	}
	update = () => {
		const edits = this.editCount()
		const successes = this.successCount()
		if (edits !== this.edits) {
			this.edits = edits
			this.pending = false
			this.quiet = false
			clearTimeout(this.timer)
			clearTimeout(this.hideTimer)
			this.show(null)
			this.timer = setTimeout(() => {
				this.quiet = true
				this.update()
			}, 60_000)
		}
		if (successes !== this.successes) {
			this.successes = successes
			this.pending = true
		}
		if (this.sources.some((source) => source.status === 'error')) {
			clearTimeout(this.hideTimer)
			this.show('error')
			return
		}
		if (this.leaving) {
			// The leave action itself gives feedback; don't repeat that success after 60 s.
			this.pending = false
			clearTimeout(this.hideTimer)
			this.show(
				this.sources.some((source) => source.status === 'saving')
					? 'saving'
					: null,
			)
			return
		}
		if (this.visible === 'saving' || this.visible === 'error') this.show(null)
		if (this.sources.some((source) => source.dirty)) {
			if (this.visible === 'saved') this.show(null)
			return
		}
		if (this.quiet && this.pending) {
			this.pending = false
			this.show('saved')
			clearTimeout(this.hideTimer)
			this.hideTimer = setTimeout(() => this.show(null), 1600)
		}
	}
	dispose() {
		clearTimeout(this.timer)
		clearTimeout(this.hideTimer)
	}
}
