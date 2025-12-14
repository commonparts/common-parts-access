import { FILE_TYPES } from '@/constants/app'
import type { UploadValidationIssue, ValidatedUploadFile } from '@/types/storage'

const MODEL_EXTENSIONS = new Set(FILE_TYPES.MODEL_FILES.map((ext) => ext.toLowerCase()))
const IMAGE_EXTENSIONS = new Set(FILE_TYPES.IMAGE_FILES.map((ext) => ext.toLowerCase()))

export const MODEL_UPLOAD_LIMITS = {
	maxModelFiles: 10,
	maxThumbnailFiles: 10,
	maxModelFileSize: 100 * 1024 * 1024,
	maxThumbnailSize: 8 * 1024 * 1024,
	maxTotalSize: 300 * 1024 * 1024,
} as const

function buildIssue(field: UploadValidationIssue['field'], message: string): UploadValidationIssue {
	return { field, message }
}

export function getFileExtension(name: string): string {
	const lastDot = name.lastIndexOf('.')
	if (lastDot === -1) return ''
	return name.slice(lastDot).toLowerCase()
}

function validateFileList(params: {
	files: File[]
	allowedExtensions: Set<string>
	maxSize: number
	field: UploadValidationIssue['field']
	category: 'model' | 'image'
}): { files: ValidatedUploadFile[]; issues: UploadValidationIssue[]; totalSize: number } {
	const validated: ValidatedUploadFile[] = []
	const issues: UploadValidationIssue[] = []
	let totalSize = 0

	for (const file of params.files) {
		const extension = getFileExtension(file.name)

		if (!params.allowedExtensions.has(extension)) {
			issues.push(
				buildIssue(
					params.field,
					`File ${file.name} has unsupported extension ${extension || '(none)'}`,
				),
			)
			continue
		}

		if (file.size > params.maxSize) {
			issues.push(
				buildIssue(
					params.field,
					`File ${file.name} exceeds limit (${Math.round(params.maxSize / (1024 * 1024))}MB)`,
				),
			)
			continue
		}

		totalSize += file.size
		validated.push({
			file,
			originalName: file.name,
			extension,
			size: file.size,
			category: params.category,
		})
	}

	return { files: validated, issues, totalSize }
}

export interface ValidateModelUploadInput {
	name?: string | null
	category?: string | null
	tags?: string[]
	modelFiles: File[]
	thumbnails?: File[]
}

export interface ValidateModelUploadResult {
	ok: boolean
	issues: UploadValidationIssue[]
	modelFiles: ValidatedUploadFile[]
	thumbnails: ValidatedUploadFile[]
	totalSize: number
}

export function validateModelUpload(input: ValidateModelUploadInput): ValidateModelUploadResult {
	const issues: UploadValidationIssue[] = []

	if (!input.name || input.name.trim().length < 3) {
		issues.push(buildIssue('title', 'Title must be at least 3 characters'))
	}

	if (!input.category || input.category.trim().length === 0) {
		issues.push(buildIssue('category', 'Category is required'))
	}

	const tags = input.tags || []
	if (tags.length > 10) {
		issues.push(buildIssue('tags', 'Maximum 10 tags allowed'))
	}

	for (const tag of tags) {
		if (tag.trim().length < 2 || tag.trim().length > 30) {
			issues.push(buildIssue('tags', `Tag "${tag}" must be 2-30 characters`))
			break
		}
	}

	if (!input.modelFiles || input.modelFiles.length === 0) {
		issues.push(buildIssue('files', 'At least one model file is required'))
	}

	if (input.modelFiles.length > MODEL_UPLOAD_LIMITS.maxModelFiles) {
		issues.push(
			buildIssue(
				'files',
				`Too many model files. Max ${MODEL_UPLOAD_LIMITS.maxModelFiles}`,
			),
		)
	}

	if (input.thumbnails && input.thumbnails.length > MODEL_UPLOAD_LIMITS.maxThumbnailFiles) {
		issues.push(
			buildIssue(
				'thumbnails',
				`Too many thumbnails. Max ${MODEL_UPLOAD_LIMITS.maxThumbnailFiles}`,
			),
		)
	}

	const modelValidation = validateFileList({
		files: input.modelFiles,
		allowedExtensions: MODEL_EXTENSIONS,
		maxSize: MODEL_UPLOAD_LIMITS.maxModelFileSize,
		field: 'files',
		category: 'model',
	})

	const thumbnailValidation = validateFileList({
		files: input.thumbnails || [],
		allowedExtensions: IMAGE_EXTENSIONS,
		maxSize: MODEL_UPLOAD_LIMITS.maxThumbnailSize,
		field: 'thumbnails',
		category: 'image',
	})

	const totalSize = modelValidation.totalSize + thumbnailValidation.totalSize
	if (totalSize > MODEL_UPLOAD_LIMITS.maxTotalSize) {
		issues.push(buildIssue('files', 'Total upload size exceeds limit'))
	}

	const allIssues = [...issues, ...modelValidation.issues, ...thumbnailValidation.issues]
	return {
		ok: allIssues.length === 0,
		issues: allIssues,
		modelFiles: modelValidation.files,
		thumbnails: thumbnailValidation.files,
		totalSize,
	}
}
