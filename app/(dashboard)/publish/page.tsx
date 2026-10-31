import { PublishPage } from '@/components/publish/publish-page'
import { enabledImageImportPlatforms } from '@/lib/curation/source-images'

// The image-import platforms depend on server configuration
// (THINGIVERSE_APP_TOKEN), read at request time rather than frozen at build.
export const dynamic = 'force-dynamic'

/**
 * Server entry of /publish: resolves the server-side configuration the
 * client flow needs — never a secret, only which platforms the source-image
 * import can run for — and renders the client page.
 */
export default function Page() {
  return <PublishPage imageImportPlatforms={enabledImageImportPlatforms()} />
}
