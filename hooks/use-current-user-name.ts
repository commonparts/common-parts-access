import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error(sessionError)
        return
      }

      const user = sessionData.session?.user
      if (!user) {
        setName(null)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.error(profileError)
        setName(null)
        return
      }

      setName(profile?.username ?? null)
    }

    fetchProfileName()
  }, [])

  return name
}
