/**
 * Shared upload limits and filename helpers.
 *
 * The server-side File-object validator that used to live here was removed
 * with the rest of the dead code (issue #295): the upload pipeline validates
 * file metadata in the route that registers it, since the bytes go straight
 * from the browser to storage and never reach a route handler.
 */

export const MODEL_UPLOAD_LIMITS = {
	maxModelFiles: 10,
	maxThumbnailFiles: 10,
	maxModelFileSize: 100 * 1024 * 1024,
	maxThumbnailSize: 8 * 1024 * 1024,
	maxTotalSize: 300 * 1024 * 1024,
} as const

/** Lowercased extension including the leading dot, or '' when there is none. */
export function getFileExtension(name: string): string {
	const lastDot = name.lastIndexOf('.')
	if (lastDot === -1) return ''
	return name.slice(lastDot).toLowerCase()
}
