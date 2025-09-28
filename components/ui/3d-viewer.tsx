import * as React from "react"
import { cn } from "@/lib/utils"

interface Model3D {
  id: string
  name: string
  fileUrl: string
  thumbnailUrl?: string
}

interface Viewer3DProps {
  model: Model3D
  width?: number
  height?: number
  className?: string
  controls?: boolean
  autoRotate?: boolean
}

export function Viewer3D({
  model,
  width = 400,
  height = 300,
  className,
  controls = true,
  autoRotate = false
}: Viewer3DProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // This would integrate with a 3D library like Three.js, Babylon.js, etc.
    // For now, we'll simulate loading
    const loadModel = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // TODO: Initialize 3D viewer with the model
        console.log('Loading 3D model:', model)
        
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load 3D model')
        setIsLoading(false)
      }
    }

    loadModel()
  }, [model])

  if (error) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg border",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg border animate-pulse",
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading 3D model...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-gradient-to-br from-background to-muted rounded-lg border overflow-hidden",
        className
      )}
      style={{ width, height }}
    >
      {/* 3D Viewer Canvas would be rendered here */}
      <div className="absolute inset-0 flex items-center justify-center">
        {model.thumbnailUrl ? (
          <img 
            src={model.thumbnailUrl} 
            alt={model.name}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm font-medium">{model.name}</p>
            <p className="text-xs text-muted-foreground">3D Model Viewer</p>
          </div>
        )}
      </div>
      
      {/* Controls overlay */}
      {controls && (
        <div className="absolute bottom-2 right-2 flex space-x-1">
          <button className="p-2 bg-background/80 backdrop-blur-sm rounded border shadow-sm hover:bg-background/90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-2 bg-background/80 backdrop-blur-sm rounded border shadow-sm hover:bg-background/90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}