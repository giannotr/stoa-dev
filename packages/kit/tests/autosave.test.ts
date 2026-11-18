import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutosaveController } from '../src/autosave/controller'

function deferred() {
	let resolve!: () => void
	let reject!: (error: Error) => void
	const promise = new Promise<void>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

describe('AutosaveController', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => vi.useRealTimers())
	it('does not save initial data, debounces edits and only writes the latest snapshot', async () => {
		const save = vi.fn(async (_value: string) => {})
		const controller = new AutosaveController({ initialValue: 'loaded', save })
		controller.start()
		await vi.advanceTimersByTimeAsync(6000)
		expect(save).not.toHaveBeenCalled()
		controller.setValue('a')
		await vi.advanceTimersByTimeAsync(500)
		controller.setValue('ab')
		await vi.advanceTimersByTimeAsync(599)
		expect(save).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)
		expect(save).toHaveBeenCalledExactlyOnceWith('ab')
		expect(controller.getSnapshot()).toMatchObject({
			dirty: false,
			status: 'saved',
		})
	})
	it('saves during continuous edits at maxWait', async () => {
		const save = vi.fn(async (_value: number) => {})
		const controller = new AutosaveController({
			initialValue: 0,
			save,
			maxWaitMs: 1000,
		})
		controller.start()
		for (let value = 1; value <= 4; value++) {
			controller.setValue(value)
			await vi.advanceTimersByTimeAsync(250)
		}
		expect(save).toHaveBeenCalledExactlyOnceWith(4)
	})
	it('serializes writes and drains edits made during a shared manual flush', async () => {
		const first = deferred()
		const save = vi
			.fn<(value: string) => Promise<void>>()
			.mockReturnValueOnce(first.promise)
			.mockResolvedValue(undefined)
		const controller = new AutosaveController({ initialValue: '', save })
		controller.setValue('old')
		const flush = controller.flush()
		expect(controller.flush()).toBe(flush)
		await Promise.resolve()
		controller.setValue('new')
		expect(save.mock.calls).toEqual([['old']])
		first.resolve()
		await flush
		expect(save.mock.calls).toEqual([['old'], ['new']])
		expect(controller.getSnapshot()).toMatchObject({
			dirty: false,
			successfulSaves: 2,
		})
	})
	it('retains the latest edit on failure, does not loop and retries it explicitly', async () => {
		const first = deferred()
		const save = vi
			.fn<(value: string) => Promise<void>>()
			.mockReturnValueOnce(first.promise)
			.mockResolvedValue(undefined)
		const controller = new AutosaveController({ initialValue: '', save })
		controller.start()
		controller.setValue('old')
		const flush = controller.flush()
		await Promise.resolve()
		controller.setValue('new')
		first.reject(new Error('disk full'))
		await expect(flush).rejects.toThrow('disk full')
		await vi.advanceTimersByTimeAsync(10000)
		expect(save).toHaveBeenCalledTimes(1)
		expect(controller.getSnapshot()).toMatchObject({
			value: 'new',
			dirty: true,
			status: 'error',
		})
		await controller.retry()
		expect(save).toHaveBeenLastCalledWith('new')
	})
	it('gates every write, including the next revision of an in-flight flush', async () => {
		const first = deferred()
		const save = vi
			.fn<(value: number) => Promise<void>>()
			.mockReturnValueOnce(first.promise)
			.mockResolvedValue(undefined)
		const controller = new AutosaveController({ initialValue: 0, save })
		controller.setValue(1)
		const flush = controller.flush()
		await Promise.resolve()
		controller.setValue(2)
		controller.configure({ save, enabled: false })
		first.resolve()
		await expect(flush).rejects.toThrow('disabled')
		await expect(controller.retry()).rejects.toThrow('disabled')
		expect(save).toHaveBeenCalledTimes(1)
		controller.configure({ save, enabled: true })
		await controller.retry()
		expect(save).toHaveBeenLastCalledWith(2)
	})
	it('supports manual-only saving and stop/start without losing queued edits', async () => {
		const save = vi.fn(async (_value: number) => {})
		const controller = new AutosaveController({
			initialValue: 0,
			save,
			autoSave: false,
		})
		controller.start()
		controller.setValue((previous) => previous + 1)
		await vi.advanceTimersByTimeAsync(6000)
		expect(save).not.toHaveBeenCalled()
		controller.configure({ save, autoSave: true })
		controller.stop()
		await vi.advanceTimersByTimeAsync(6000)
		expect(save).not.toHaveBeenCalled()
		controller.start()
		await vi.advanceTimersByTimeAsync(600)
		expect(save).toHaveBeenCalledExactlyOnceWith(1)
	})
	it('recovers from a synchronous adapter exception', async () => {
		const save = vi.fn((): Promise<void> => {
			throw new Error('sync failure')
		})
		const controller = new AutosaveController({ initialValue: 0, save })
		controller.setValue(1)
		await expect(controller.flush()).rejects.toThrow('sync failure')
		save.mockResolvedValue(undefined)
		await controller.retry()
		expect(controller.getSnapshot().dirty).toBe(false)
	})
})
