'use client'

import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface CurrentUserAvatarProps {
  className?: string
  name?: string | null
}

export const CurrentUserAvatar = ({ className, name }: CurrentUserAvatarProps) => {
  const profileImage = useCurrentUserImage()
  const initials = name
    ?.split(' ')
    ?.map((word: string) => word[0])
    ?.join('')
    ?.toUpperCase()

  return (
    <Avatar className={cn(className)}>
      {profileImage ? (
        <AvatarImage src={profileImage} alt={initials} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  )
}
