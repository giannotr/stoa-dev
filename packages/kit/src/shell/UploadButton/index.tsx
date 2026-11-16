import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '../../ui/button'

export function UploadButton({
	label,
	acceptedFileTypes,
	onFilesSelected,
}: {
	label: string
	acceptedFileTypes: string
	onFilesSelected: (files: FileList | null) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)

	return (
		<>
			<Button
				type='button'
				variant='outline'
				className='justify-start'
				onClick={() => inputRef.current?.click()}
			>
				<Upload />
				{label}
			</Button>

			<input
				ref={inputRef}
				type='file'
				accept={acceptedFileTypes}
				multiple
				className='hidden'
				aria-label={label}
				onChange={(event) => {
					onFilesSelected(event.target.files)
					event.target.value = ''
				}}
			/>
		</>
	)
}
