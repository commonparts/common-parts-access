'use client'

import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type CurrentUserAvatarProps = {
  className?: string
}

export const CurrentUserAvatar = ({ className }: CurrentUserAvatarProps) => {
  const profileImage = useCurrentUserImage()
  const name = useCurrentUserName()
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
