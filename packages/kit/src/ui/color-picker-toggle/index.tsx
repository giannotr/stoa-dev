'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STOA_NS } from '../../i18n/namespace'
import { Button } from '../button'
import { ColorPicker, type ColorPickerProps } from '../color-picker'
import { DEFAULT_COLOR, normalizeColor } from '../color-picker/color'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

export interface ColorPickerToggleProps extends ColorPickerProps {
	/** Accessible name for the trigger. */
	label?: string
	disabled?: boolean
}

export function ColorPickerToggle({
	value,
	defaultValue,
	onChange,
	className,
	label,
	disabled,
}: ColorPickerToggleProps) {
	const { t } = useTranslation(STOA_NS)
	const [internal, setInternal] = useState(
		() => normalizeColor(defaultValue ?? '') ?? DEFAULT_COLOR,
	)
	const color =
		value === undefined ? internal : (normalizeColor(value) ?? DEFAULT_COLOR)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='outline'
					disabled={disabled}
					className={className}
					aria-label={`${label ?? t('colorPicker.choose', 'Choose color')}: ${color}`}
				>
					<span
						aria-hidden='true'
						className='size-5 rounded-full border border-current/25'
						style={{ backgroundColor: color }}
					/>
					<span className='font-mono'>{color}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				sideOffset={8}
				collisionPadding={12}
				aria-label={t('colorPicker.title', 'Color instrument')}
				className='max-h-(--radix-popover-content-available-height) w-[27.5rem] max-w-(--radix-popover-content-available-width) overflow-y-auto overscroll-contain rounded-[1.375rem] p-0'
			>
				<ColorPicker
					value={color}
					onChange={(next) => {
						if (value === undefined) setInternal(next)
						onChange?.(next)
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}
