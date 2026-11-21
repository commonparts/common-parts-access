'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PartThumbnail } from '@/components/part/part-thumbnail'
import { FILE_TYPES } from '@/constants/app'
import { Link, useRouter } from '@/i18n/navigation'
import { editPublishedPart } from '@/lib/actions/part-edit'
import { StorageUploadError, uploadFilesFromClient, type ClientUploadedFile } from '@/lib/storage/client-upload'
import { getFileExtension, PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import type { getPublishedPartForEdit } from '@/lib/supabase/queries/part-edit'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface EditPublishedPartFormProps {
  part: NonNullable<Awaited<ReturnType<typeof getPublishedPartForEdit>>>
  userId: string
}

const limits = VALIDATION_LIMITS.PART
const { maxThumbnailFiles, maxThumbnailSize } = PART_UPLOAD_LIMITS

export function EditPublishedPartForm({ part, userId }: EditPublishedPartFormProps) {
  const t = useTranslations('EditPublishedPart')
  const fields = useTranslations('Fields')
  const gallery = useTranslations('RegisteredImages')
  const router = useRouter()
  const initialDetails = { title: part.name, description: part.description, instructions: part.instructions }
  const [details, setDetails] = useState(initialDetails)
  const [removed, setRemoved] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Keep successful uploads across a retry so a connection failure does not upload them again.
  const uploaded = useRef(new Map<File, ClientUploadedFile>())
  const changed = removed.length > 0 || files.length > 0 ||
    details.title !== part.name || details.description !== part.description || details.instructions !== part.instructions
  const cover = part.images.find(({ reference }) => !removed.includes(reference))?.reference

  function addPhotos(selection: FileList | null) {
    const added = Array.from(selection ?? [])
    if (added.length === 0) return

    const invalid = added.find((file) => file.size === 0 || file.size > maxThumbnailSize ||
      !FILE_TYPES.IMAGE_FILES.some((extension) => extension === getFileExtension(file.name)))
    if (invalid) {
      setError(t('invalidPhoto', { name: invalid.name, size: maxThumbnailSize / (1024 * 1024) }))
      return
    }

    if (part.images.length - removed.length + files.length + added.length > maxThumbnailFiles) {
      setError(t('photoLimit', { count: maxThumbnailFiles }))
      return
    }
    setError(null)
    setFiles([...files, ...added])
  }

  function save() {
    setError(null)
    startTransition(async () => {
      if (files.length > 0 && part.images.length - removed.length + files.length > maxThumbnailFiles) {
        setError(t('photoLimit', { count: maxThumbnailFiles }))
        return
      }
      try {
        const pendingFiles = files.filter((file) => !uploaded.current.has(file))
        if (pendingFiles.length > 0) {
          const { thumbnails } = await uploadFilesFromClient({
            userId, partId: part.id, modelFiles: [], thumbnails: pendingFiles,
          })
          pendingFiles.forEach((file, index) => uploaded.current.set(file, thumbnails[index]))
        }

        const result = await editPublishedPart({
          id: part.id,
          revision: part.revision,
          title: details.title !== part.name ? details.title : undefined,
          description: details.description !== part.description ? details.description : undefined,
          instructions: details.instructions !== part.instructions ? details.instructions : undefined,
          removedImages: removed,
          files: files.map((file) => uploaded.current.get(file)),
        })
        if (!result.ok) {
          setError(result.error)
          return
        }

        router.replace(`/parts/${part.slug}`)
      } catch (error) {
        setError(error instanceof StorageUploadError ? t('uploadFailed', { name: error.fileName }) : t('saveFailed'))
      }
    })
  }

  return (
    <form className="max-w-3xl space-y-md" onSubmit={(event) => { event.preventDefault(); save() }}>
      <fieldset disabled={pending} className="space-y-md">
        <Card>
          <CardContent className="space-y-md">
            <div className="space-y-2xs">
              <Label htmlFor="part-title">{fields('title')}</Label>
              <Input id="part-title" value={details.title} required minLength={limits.TITLE_MIN_LENGTH}
                maxLength={limits.TITLE_MAX_LENGTH}
                onChange={(event) => setDetails({ ...details, title: event.target.value })} />
            </div>
            <div className="space-y-2xs">
              <Label htmlFor="part-description">{fields('description')}</Label>
              <Textarea id="part-description" value={details.description} rows={3}
                maxLength={limits.DESCRIPTION_MAX_LENGTH}
                onChange={(event) => setDetails({ ...details, description: event.target.value })} />
            </div>
            <div className="space-y-2xs">
              <Label htmlFor="part-instructions">{fields('instructions')}</Label>
              <Textarea id="part-instructions" value={details.instructions} rows={6}
                maxLength={limits.INSTRUCTIONS_MAX_LENGTH}
                onChange={(event) => setDetails({ ...details, instructions: event.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('photos')}</CardTitle></CardHeader>
          <CardContent className="space-y-md">
            {part.images.length > 0 && (
              <ul className="flex flex-wrap gap-sm">
                {part.images.map(({ reference, url }, index) => {
                  const isRemoved = removed.includes(reference)
                  const label = gallery('image', { position: index + 1 })
                  return (
                    <li key={reference} className="space-y-2xs">
                      <div className={`relative size-4xl overflow-hidden rounded-md border border-border-subtle ${isRemoved ? 'opacity-50' : ''}`}>
                        <PartThumbnail src={url} alt={label} sizes="96px" />
                        {reference === cover && (
                          <span className="absolute inset-x-0 bottom-0 bg-bg-overlay py-3xs text-center text-xs text-text-primary">
                            {gallery('thumbnail')}
                          </span>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm"
                        aria-label={t(isRemoved ? 'restoreImage' : 'removeImage', { name: label })}
                        onClick={() => {
                          setRemoved(isRemoved ? removed.filter((image) => image !== reference) : [...removed, reference])
                          setError(null)
                        }}>
                        {t(isRemoved ? 'restore' : 'remove')}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="space-y-2xs">
              <Label htmlFor="part-photos">{t('addPhotos')}</Label>
              <Input id="part-photos" type="file" accept={FILE_TYPES.IMAGE_FILES.join(',')} multiple
                aria-describedby="part-photos-limit"
                onChange={(event) => {
                  addPhotos(event.target.files)
                  event.target.value = ''
                }} />
              <p id="part-photos-limit" className="text-sm text-text-secondary">{t('photoLimit', { count: maxThumbnailFiles })}</p>
            </div>

            {files.length > 0 && (
              <ul className="divide-y divide-border-subtle">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-sm py-2xs">
                    <span className="min-w-0 break-all text-sm">{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" aria-label={t('removeImage', { name: file.name })}
                      onClick={() => { setFiles(files.filter((_, position) => position !== index)); setError(null) }}>
                      {t('remove')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </fieldset>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap gap-sm">
        <Button type="submit" disabled={pending || !changed}>{t(pending ? 'saving' : 'save')}</Button>
        {!pending && <Button variant="outline" asChild><Link href="/my-parts">{t('cancel')}</Link></Button>}
      </div>
    </form>
  )
}
