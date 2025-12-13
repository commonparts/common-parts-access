export type ModelFileCategory = 'model' | 'image' | 'documentation'

export interface UploadValidationIssue {
	field: 'title' | 'category' | 'files' | 'thumbnails' | 'tags' | 'payload'
	message: string
}

export interface ValidatedUploadFile {
	file: File
	originalName: string
	extension: string
	size: number
	category: ModelFileCategory
}

export interface UploadedAsset {
	bucket: string
	path: string
	publicUrl: string
	filename: string
	originalName: string
	extension: string
	size: number
	contentType?: string
	category: ModelFileCategory
}

export interface UploadAssetsResult {
	modelFiles: UploadedAsset[]
	thumbnails: UploadedAsset[]
	primaryThumbnailUrl?: string | null
	imageUrls: string[]
}
