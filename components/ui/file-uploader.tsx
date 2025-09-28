import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

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
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragOver 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/25 hover:border-primary/50",
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
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your files here, or{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Max file size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}