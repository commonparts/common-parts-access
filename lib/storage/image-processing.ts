const INVALID_CHARS_REGEX = /[^A-Za-z0-9._-]/g

export function sanitizeFilename(name: string, fallback: string): string {
	const trimmed = name.trim().replace(/\s+/g, '-')
	const cleaned = trimmed.replace(INVALID_CHARS_REGEX, '').replace(/-+/g, '-').replace(/_+/g, '_')
	const safe = cleaned || fallback
	return safe.slice(0, 120)
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
}

export function inferImageContentType(extension: string): string | undefined {
	return IMAGE_CONTENT_TYPES[extension.toLowerCase()]
}
