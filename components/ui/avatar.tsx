import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('relative flex h-xl w-xl shrink-0 overflow-hidden rounded-full', className)} {...props} />
))
Avatar.displayName = 'Avatar'

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(({ className, alt = '', ...props }, ref) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img ref={ref} className={cn('aspect-square h-full w-full object-cover', className)} alt={alt} {...props} />
))
AvatarImage.displayName = 'AvatarImage'

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)} {...props} />
))
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
