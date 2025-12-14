import { STORAGE_BUCKETS } from '@/constants/app'
import { inferImageContentType, sanitizeFilename } from '@/lib/storage/image-processing'
import { getFileExtension } from '@/lib/storage/file-validation'
import type { UploadAssetsResult, UploadedAsset, ValidatedUploadFile } from '@/types/storage'

type SupabaseServerClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

interface BuildPathInput {
	userId: string
	modelId: string
	filename: string
	kind: 'model' | 'thumbnail' | 'documentation'
}

function baseName(name: string) {
	const lastDot = name.lastIndexOf('.')
	return lastDot === -1 ? name : name.slice(0, lastDot)
}

function uniqueFilename(originalName: string) {
	const extension = getFileExtension(originalName) || ''
	const name = sanitizeFilename(baseName(originalName), 'file')
	const suffix = Date.now().toString(36)
	return `${name}-${suffix}${extension}`
}

function resolveModelContentType(extension: string): string {
	switch (extension.toLowerCase()) {
		case '.stl':
			return 'model/stl'
		case '.obj':
			return 'text/plain'
		case '.stp':
		case '.step':
			return 'model/step'
		default:
			return 'application/octet-stream'
	}
}

function buildStoragePath(input: BuildPathInput) {
	const prefix = `user-${input.userId}/model-${input.modelId}`
	const folder = input.kind === 'thumbnail' ? 'thumbnails' : 'files'
	return `${prefix}/${folder}/${input.filename}`
}

async function uploadSingle(params: {
	supabase: SupabaseServerClient
	file: ValidatedUploadFile
	userId: string
	modelId: string
	kind: 'model' | 'thumbnail' | 'documentation'
}): Promise<UploadedAsset> {
	const filename = uniqueFilename(params.file.originalName)
	const path = buildStoragePath({
		userId: params.userId,
		modelId: params.modelId,
		filename,
		kind: params.kind,
	})

	const bucket = params.kind === 'thumbnail' ? STORAGE_BUCKETS.MODEL_THUMBNAILS : STORAGE_BUCKETS.MODEL_FILES

	// Strict content types: enforce mapped types per allowed extensions
	const contentType = params.kind === 'thumbnail'
		? (inferImageContentType(params.file.extension) || 'image/jpeg')
		: resolveModelContentType(params.file.extension)

	const uploadBody = params.file.file.type === contentType
		? params.file.file
		: new File([params.file.file], params.file.file.name || params.file.originalName, { type: contentType })

	const { error } = await params.supabase.storage
		.from(bucket)
		.upload(path, uploadBody, {
			upsert: false,
			contentType,
		})

	if (error) {
		throw error
	}

	const { data: publicData } = params.supabase.storage.from(bucket).getPublicUrl(path)
	return {
		bucket,
		path,
		publicUrl: publicData.publicUrl,
		filename,
		originalName: params.file.originalName,
		extension: params.file.extension.replace(/^\./, ''),
		size: params.file.size,
		contentType: contentType || undefined,
		category: params.kind === 'thumbnail' ? 'image' : params.file.category,
	}
}

async function cleanupUploads(supabase: SupabaseServerClient, assets: UploadedAsset[]) {
	const buckets = assets.reduce<Record<string, string[]>>((acc, asset) => {
		acc[asset.bucket] = acc[asset.bucket] || []
		acc[asset.bucket].push(asset.path)
		return acc
	}, {})

	await Promise.all(
		Object.entries(buckets).map(([bucket, paths]) =>
			supabase.storage.from(bucket).remove(paths),
		),
	)
}

export interface UploadModelAssetsInput {
	supabase: SupabaseServerClient
	userId: string
	modelId: string
	modelFiles: ValidatedUploadFile[]
	thumbnails?: ValidatedUploadFile[]
}

export async function uploadModelAssets(input: UploadModelAssetsInput): Promise<UploadAssetsResult> {
	const uploaded: UploadedAsset[] = []

	try {
		for (const file of input.modelFiles) {
			const asset = await uploadSingle({
				supabase: input.supabase,
				file,
				userId: input.userId,
				modelId: input.modelId,
				kind: 'model',
			})
			uploaded.push(asset)
		}

		const thumbnails: UploadedAsset[] = []
		for (const thumb of input.thumbnails || []) {
			const asset = await uploadSingle({
				supabase: input.supabase,
				file: thumb,
				userId: input.userId,
				modelId: input.modelId,
				kind: 'thumbnail',
			})
			uploaded.push(asset)
			thumbnails.push(asset)
		}

		const imageUrls = thumbnails.map((asset) => asset.publicUrl)
		const primaryThumbnailUrl = thumbnails[0]?.publicUrl ?? null

		return {
			modelFiles: uploaded.filter((asset) => asset.category === 'model'),
			thumbnails,
			primaryThumbnailUrl,
			imageUrls,
		}
	} catch (error) {
		await cleanupUploads(input.supabase, uploaded)
		throw error
	}
}
