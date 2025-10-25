'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  onFileDownload?: (file: ModelFile) => void
}

export function ModelFileList({ 
  files, 
  modelSlug,
  showCard = true, 
  className = "",
  onFileDownload 
}: ModelFileListProps) {
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const modelFiles = files.filter(file => file.file_category === 'model')
  const documentationFiles = files.filter(file => file.file_category === 'documentation')
  const imageFiles = files.filter(file => file.file_category === 'image')

  const handleDownload = (file: ModelFile) => {
    if (onFileDownload) {
      onFileDownload(file)
    } else {
      // Default download behavior
      console.log('Downloading file:', file.original_filename)
    }
  }

  const FileContent = () => (
    <div className={`space-y-4 ${className}`}>
      {/* 3D Model Files */}
      {modelFiles.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground">3D MODELS</h4>
          <div className="space-y-2">
            {modelFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {file.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownload(file)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentation Files */}
      {documentationFiles.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground">DOCUMENTATION</h4>
          <div className="space-y-2">
            {documentationFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {file.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownload(file)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Files */}
      {imageFiles.length > 0 && (
        <div>
          <h4 className="font-medium mb-3 text-sm text-muted-foreground">IMAGES</h4>
          <div className="space-y-2">
            {imageFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {file.original_filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.file_type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)}
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownload(file)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="text-center py-6">
          <svg className="w-12 h-12 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-muted-foreground">No files available</p>
        </div>
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
        <CardContent>
          <FileContent />
        </CardContent>
      </Card>
    )
  }

  return <FileContent />
}
