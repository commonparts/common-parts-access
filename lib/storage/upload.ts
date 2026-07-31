/**
 * Content-type resolution for uploaded model files.
 *
 * The server-side `uploadModelAssets` pipeline that used to live here was
 * removed with the rest of the dead code (issue #295). Uploads go directly
 * from the browser to Supabase Storage via `lib/storage/client-upload.ts`,
 * which is the only consumer left of this module.
 */

export function resolveModelContentType(extension: string): string {
	switch (extension.toLowerCase()) {
		case '.stl':
			return 'model/stl'
		case '.obj':
			return 'model/obj'
		case '.stp':
		case '.step':
			return 'model/step'
		case '.3mf':
			return 'model/3mf'
		default:
			return 'application/octet-stream'
	}
}
