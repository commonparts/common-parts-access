import * as React from "react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  className?: string
  children?: React.ReactNode
  /** Blocks both click-to-browse and drag-and-drop, and greys out the zone. */
  disabled?: boolean
}

export function FileUploader({
  onFilesSelect,
  accept = "*/*",
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  children,
  disabled = false
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // A disabled zone must not keep a stale drag highlight from before it was disabled.
  React.useEffect(() => {
    if (disabled) setIsDragOver(false)
  }, [disabled])

  // preventDefault stays on every drag event even when disabled, so a file
  // dropped on a disabled zone is swallowed instead of opened by the browser.
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files).filter(file => {
      return file.size <= maxSize
    })
    
    if (files.length > 0) {
      onFilesSelect(files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file => {
      return file.size <= maxSize
    })
    
    if (files.length > 0) {
      onFilesSelect(files)
    }
  }

  const handleClick = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  return (
    <div
      aria-disabled={disabled || undefined}
      className={cn(
        "rounded-lg border border-dashed border-border-subtle p-lg text-center shadow-none transition-colors",
        // A div has no :disabled state, so the design-system disabled tokens are applied directly.
        disabled
          ? "cursor-not-allowed bg-bg-disabled text-text-disabled [&_*]:text-text-disabled"
          : isDragOver
            ? "cursor-pointer border-action-primary bg-action-primary/5"
            : "cursor-pointer bg-bg-surface hover:border-action-primary/60 hover:bg-bg-hover",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {children || (
        <div className="space-y-md">
          <div className="mx-auto flex size-2xl items-center justify-center rounded-full bg-bg-subtle text-text-secondary">
            <svg className="size-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="mb-sm text-sm text-text-secondary">
              Drag and drop your files here, or{" "}
              <span className="font-medium text-action-primary">browse</span>
            </p>
            <p className="text-xs text-text-secondary">
              Max file size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}