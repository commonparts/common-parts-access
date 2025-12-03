'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ModelFile {
  id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  file_url: string
  file_category: string
  created_at: string
}

interface ModelFileListProps {
  files: ModelFile[]
  modelSlug?: string
  showCard?: boolean
  className?: string
  onFileDownload?: (file: ModelFile) => Promise<void>
}

type FileCategory = "model" | "documentation" | "image" | string

const FILE_SIZE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"] as const

const SECTION_ORDER: FileCategory[] = ["model", "documentation", "image"]

const SECTION_CONFIG = {
  model: {
    label: "3D MODELS",
    iconWrapperClass: "bg-primary/10 text-primary",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  documentation: {
    label: "DOCUMENTATION",
    iconWrapperClass: "bg-secondary/50 text-secondary-foreground",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  image: {
    label: "IMAGES",
    iconWrapperClass: "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  default: {
    label: "FILES",
    iconWrapperClass: "bg-muted text-muted-foreground",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
} as const

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 Bytes"
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), FILE_SIZE_UNITS.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${Math.round(value * 100) / 100} ${FILE_SIZE_UNITS[exponent]}`
}

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

interface FileRowProps {
  file: ModelFile
  isDownloading: boolean
  iconWrapperClass: string
  icon: React.ReactNode
  onDownload: (file: ModelFile) => void
}

const FileRow = React.memo(({ file, isDownloading, iconWrapperClass, icon, onDownload }: FileRowProps) => (
  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
    <div className={cn("w-8 h-8 rounded flex items-center justify-center flex-shrink-0", iconWrapperClass)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{file.original_filename}</p>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant="outline" className="text-xs">
          {file.file_type.toUpperCase()}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</span>
      </div>
    </div>
    <Button
      size="sm"
      variant="ghost"
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => onDownload(file)}
      disabled={isDownloading}
      aria-label={`Download ${file.original_filename}`}
    >
      {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
    </Button>
  </div>
))

FileRow.displayName = "FileRow"

export function ModelFileList({ 
  files, 
  modelSlug,
  showCard = true, 
  className = "",
  onFileDownload 
}: ModelFileListProps) {
  const [downloadingFiles, setDownloadingFiles] = React.useState<Set<string>>(new Set())

  const handleDownload = React.useCallback(
    async (file: ModelFile) => {
      if (downloadingFiles.has(file.id)) {
        return
      }

      setDownloadingFiles((prev) => new Set(prev).add(file.id))

      try {
        if (onFileDownload) {
          await onFileDownload(file)
        } else {
          console.log("Downloading file:", file.original_filename, modelSlug)
          window.open(file.file_url, "_blank")
        }
      } catch (error) {
        console.error("Download failed:", error)
      } finally {
        setDownloadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(file.id)
          return next
        })
      }
    },
    [downloadingFiles, modelSlug, onFileDownload]
  )

  const sections = React.useMemo(() => {
    if (files.length === 0) return []

    const grouped = files.reduce<Record<FileCategory, ModelFile[]>>((acc, file) => {
      if (!acc[file.file_category]) {
        acc[file.file_category] = []
      }
      acc[file.file_category].push(file)
      return acc
    }, {})

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        const aIndex = SECTION_ORDER.indexOf(a)
        const bIndex = SECTION_ORDER.indexOf(b)
        const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
        const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex
        return safeA - safeB
      })
      .map(([category, groupedFiles]) => {
        const config = SECTION_CONFIG[category as keyof typeof SECTION_CONFIG] ?? SECTION_CONFIG.default
        return {
          category,
          files: groupedFiles,
          ...config,
        }
      })
  }, [files])

  const content = (
    <div className={cn("space-y-4", className)}>
      {sections.length === 0 ? (
        <div className="text-center py-6">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-muted-foreground">No files available</p>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.category}>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground">{section.label}</h4>
            <div className="space-y-2">
              {section.files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isDownloading={downloadingFiles.has(file.id)}
                  iconWrapperClass={section.iconWrapperClass}
                  icon={section.icon}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )

  if (showCard) {
    return (
      <Card className="break-inside-avoid mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Files
          </CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  return content
}
