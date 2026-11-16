import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../../ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../ui/dialog'

export interface ConfirmDialogProps {
	title: string
	description: ReactNode
	confirmLabel: string
	cancelLabel?: string
	onConfirm: () => Promise<unknown> | unknown
	/** Uncontrolled usage: element that opens the dialog. */
	trigger?: ReactNode
	/** Controlled usage: pass `open` and `onOpenChange` instead of `trigger`. */
	open?: boolean
	onOpenChange?: (open: boolean) => void
	variant?: 'destructive' | 'default'
}

/**
 * Supports both call styles found in the apps:
 * `<ConfirmDialog trigger={<Button/>} … />` (latextemplater) and
 * `<ConfirmDialog open={open} onOpenChange={setOpen} … />` (practicr).
 */
export function ConfirmDialog({
	title,
	description,
	confirmLabel,
	cancelLabel,
	onConfirm,
	trigger,
	open: controlledOpen,
	onOpenChange,
	variant = 'destructive',
}: ConfirmDialogProps) {
	const { t } = useTranslation(STOA_NS)
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	const open = controlledOpen ?? uncontrolledOpen
	const setOpen = (next: boolean) => {
		if (controlledOpen === undefined) setUncontrolledOpen(next)
		onOpenChange?.(next)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant='ghost' disabled={busy}>
							{cancelLabel ?? t('actions.cancel')}
						</Button>
					</DialogClose>
					<Button
						variant={variant}
						disabled={busy}
						onClick={async () => {
							setBusy(true)
							try {
								await onConfirm()
								setOpen(false)
							} finally {
								setBusy(false)
							}
						}}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
