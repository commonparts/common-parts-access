'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploader } from '@/components/ui/file-uploader'
import { Label } from '@/components/ui/label'
import { RegisteredImages } from '@/components/publish/registered-images'
import type { ModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { FILE_TYPES } from '@/constants/app'
import { isValidHttpUrl } from '@/lib/utils/validation'

interface FilesStepProps {
  form: ModelUploadFormState
  idPrefix: string
  /**
   * True when the files stay at the source. The model-file drop zone is then
   * hidden entirely rather than shown disabled — a control that cannot be used
   * is not an explanation of why.
   */
  referenced?: boolean
  /** Where the files actually live, for a referenced part. */
  sourceUrl?: string | null
  modelFileCount: number
  /** Registered image URLs in canonical order. */
  imageUrls: string[]
  uploading: boolean
  /**
   * False while the session is still resolving the owner id the storage path
   * needs — uploading before that silently does nothing.
   */
  uploadReady?: boolean
  onUpload: () => void
  /** Source-gallery import running in the background. */
  importingImages?: boolean
  /** Inline judgements owned by this step. */
  judgements?: React.ReactNode
  /** One line under the upload button, explaining what happens on upload. */
  helpText?: string
}

/**
 * The Files step, shared by both tracks (issue #302). Files register as soon
 * as they upload, so leaving the session never loses them.
 *
 * A referenced part has no model-file drop zone at all: the files are at the
 * source and uploading them here would contradict the reason it is referenced.
 * Photos are still welcome either way.
 */
export function FilesStep({
  form,
  idPrefix,
  referenced = false,
  sourceUrl,
  modelFileCount,
  imageUrls,
  uploading,
  uploadReady = true,
  onUpload,
  importingImages = false,
  judgements,
  helpText,
}: FilesStepProps) {
  const { formData } = form
  const nothingSelected = formData.files.length === 0 && formData.thumbnails.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Files</CardTitle>
        <div className="flex gap-2xs">
          {!referenced && (
            <Badge variant={modelFileCount > 0 ? 'soft' : 'outline'}>
              {modelFileCount} model {modelFileCount === 1 ? 'file' : 'files'}
            </Badge>
          )}
          <Badge variant={imageUrls.length > 0 ? 'soft' : 'outline'}>
            {imageUrls.length} {imageUrls.length === 1 ? 'image' : 'images'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          {referenced ? (
            <div className="space-y-2xs">
              <Label>Model files</Label>
              <p className="rounded-md border border-border-subtle bg-bg-subtle p-sm text-sm text-text-secondary">
                The model files stay where they are published and are never uploaded here.{' '}
                {sourceUrl && isValidHttpUrl(sourceUrl) ? (
                  <>
                    Check at{' '}
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-text-primary underline"
                    >
                      the source
                    </a>{' '}
                    that they open correctly.
                  </>
                ) : (
                  'Check at the source that they open correctly.'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2xs">
              <Label>Model files (STL / 3MF / STEP)</Label>
              <FileUploader
                accept={FILE_TYPES.MODEL_FILES.join(',')}
                multiple
                onFilesSelect={form.handleFilesSelect}
              />
              {formData.files.length > 0 && (
                <p className="text-sm text-text-secondary">
                  Selected: {formData.files.map((f) => f.name).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2xs">
            <Label>Photos of the printed part</Label>
            {importingImages && (
              <p className="text-sm text-text-secondary">Importing images from the source…</p>
            )}
            <FileUploader
              accept={FILE_TYPES.IMAGE_FILES.join(',')}
              multiple
              onFilesSelect={form.handleThumbnailsSelect}
            />
            {formData.thumbnails.length > 0 && (
              <p className="text-sm text-text-secondary">
                Selected: {formData.thumbnails.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        <RegisteredImages urls={imageUrls} />

        <div className="flex items-center gap-sm">
          <Button
            id={`${idPrefix}-upload`}
            onClick={onUpload}
            disabled={uploading || !uploadReady || nothingSelected}
          >
            {uploading ? 'Uploading…' : 'Upload selected files'}
          </Button>
          <p className="text-sm text-text-secondary">
            {!uploadReady
              ? 'Preparing the upload session…'
              : (helpText ??
                'Files are stored as soon as you upload them — you can leave and come back.')}
          </p>
        </div>

        {judgements && (
          <div className="space-y-sm border-t border-border-subtle pt-md">{judgements}</div>
        )}
      </CardContent>
    </Card>
  )
}
