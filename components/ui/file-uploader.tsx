import * as React from "react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  className?: string
  children?: React.ReactNode
}

export function FileUploader({
  onFilesSelect,
  accept = "*/*",
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  children
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
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
    fileInputRef.current?.click()
  }

  return (
    <div
      className={cn(
          "cursor-pointer rounded-lg border border-dashed border-border-subtle bg-bg-surface p-lg text-center shadow-none transition-colors",
        isDragOver
          ? "border-action-primary bg-action-primary/5"
          : "hover:border-action-primary/60 hover:bg-bg-hover",
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