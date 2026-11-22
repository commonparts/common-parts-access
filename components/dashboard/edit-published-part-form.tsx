'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploader } from '@/components/ui/file-uploader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PartThumbnail } from '@/components/part/part-thumbnail'
import { FILE_TYPES } from '@/constants/app'
import { Link, useRouter } from '@/i18n/navigation'
import { editPublishedPart } from '@/lib/actions/part-edit'
import { cleanupUploadedFiles, StorageUploadError, uploadFilesFromClient } from '@/lib/storage/client-upload'
import { getFileExtension, PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'
import type { getPublishedPartForEdit } from '@/lib/supabase/queries/part-edit'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

interface EditPublishedPartFormProps {
  part: NonNullable<Awaited<ReturnType<typeof getPublishedPartForEdit>>>
  userId: string
}

const limits = VALIDATION_LIMITS.PART
const { maxThumbnailFiles, maxThumbnailSize } = PART_UPLOAD_LIMITS
const editableFields = [
  { name: 'title', maxLength: limits.TITLE_MAX_LENGTH },
  { name: 'description', maxLength: limits.DESCRIPTION_MAX_LENGTH, rows: 3 },
  { name: 'instructions', maxLength: limits.INSTRUCTIONS_MAX_LENGTH, rows: 6 },
] as const

/** Edits published text and stages gallery changes until the owner saves. */
export function EditPublishedPartForm({ part, userId }: EditPublishedPartFormProps) {
  const t = useTranslations('EditPublishedPart')
  const fields = useTranslations('Fields')
  const gallery = useTranslations('RegisteredImages')
  const router = useRouter()
  const initialDetails = { title: part.name, description: part.description, instructions: part.instructions }
  const [details, setDetails] = useState<Partial<typeof initialDetails>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const changed = removed.length > 0 || files.length > 0 || Object.values(details).some((value) => value !== undefined)
  const cover = part.images.find(({ reference }) => !removed.includes(reference))?.reference
  const remainingSlots = maxThumbnailFiles - part.images.length + removed.length - files.length
  const photoLimitMessage = t('photoLimit', { count: maxThumbnailFiles })

  function rejectPhoto(file: File) {
    setError(t('invalidPhoto', { name: file.name, size: maxThumbnailSize / (1024 * 1024) }))
  }

  function addPhotos(added: File[]) {
    const invalid = added.find((file) => file.size === 0 ||
      !FILE_TYPES.IMAGE_FILES.some((extension) => extension === getFileExtension(file.name)))
    if (invalid) return rejectPhoto(invalid)
    if (added.length > remainingSlots) return setError(photoLimitMessage)

    setError(null)
    setFiles([...files, ...added])
  }

  /** Uploads a fresh batch before committing the text and gallery together. */
  function save() {
    if (files.length && remainingSlots < 0) return setError(photoLimitMessage)
    setError(null)
    startTransition(async () => {
      try {
        // Each attempt has its own paths. A later conflict must never delete
        // a photo from an earlier attempt that committed without a response.
        const { thumbnails } = files.length > 0
          ? await uploadFilesFromClient({
            userId, partId: part.id, modelFiles: [], thumbnails: files,
          })
          : { thumbnails: [] }

        const result = await editPublishedPart({
          id: part.id,
          revision: part.revision,
          ...details,
          removedImages: removed,
          files: thumbnails,
        })
        if (!result.ok) {
          if (result.discardUploads) await cleanupUploadedFiles(thumbnails)
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
          <CardContent className="space-y-md pt-lg">
            {editableFields.map((field) => {
              const { name, maxLength } = field
              const props = {
                id: `part-${name}`,
                value: details[name] ?? initialDetails[name],
                maxLength,
                onChange: ({ target: { value } }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setDetails((current) => ({ ...current, [name]: value === initialDetails[name] ? undefined : value })),
              }
              return (
                <div key={name} className="space-y-2xs">
                  <Label htmlFor={props.id}>{fields(name)}</Label>
                  {'rows' in field
                    ? <Textarea {...props} rows={field.rows} />
                    : <Input {...props} required minLength={limits.TITLE_MIN_LENGTH} />}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('photos')}</CardTitle></CardHeader>
          <CardContent className="space-y-md">
            {part.images.length > 0 && (
              <ul className="flex flex-wrap gap-sm">
                {part.images.map(({ reference, url }, index) => {
                  const isRemoved = removed.includes(reference)
                  const action = isRemoved ? 'restore' : 'remove'
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
                        aria-label={t(`${action}Image`, { name: label })}
                        onClick={() => {
                          setRemoved(isRemoved ? removed.filter((image) => image !== reference) : [...removed, reference])
                          setError(null)
                        }}>
                        {t(action)}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="space-y-2xs">
              <Label htmlFor="part-photos">{t('addPhotos')}</Label>
              <FileUploader
                id="part-photos"
                aria-describedby="part-photos-limit"
                accept={FILE_TYPES.IMAGE_FILES.join(',')}
                maxSize={maxThumbnailSize}
                disabled={pending}
                onFilesSelect={addPhotos}
                onFileTooLarge={rejectPhoto}
              />
              <p id="part-photos-limit" className="text-sm text-text-secondary">{photoLimitMessage}</p>
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
