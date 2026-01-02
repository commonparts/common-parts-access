import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error(sessionError)
        return
      }

      const user = sessionData.session?.user
      if (!user) {
        setImage(null)
        return
      }

      const metadataAvatar = user.user_metadata?.avatar_url as string | undefined
      if (metadataAvatar) {
        setImage(metadataAvatar)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
        setImage(null)
        return
      }

      setImage(profile?.avatar_url ?? null)
    }

    fetchUserImage()
  }, [])

  return image
}