import { createClient } from '@/lib/supabase/client'

type FeedbackType = 'bug' | 'improvement' | 'question' | 'other'

interface SubmitFeedbackPayload {
  type: FeedbackType
  title: string
  description: string
  email: string | null
  url: string | null
  user_agent: string | null
}

/**
 * Inserts a feedback record into the feedback table.
 * Called from the client-side feedback widget.
 * Derives user_id internally from the authenticated session so callers cannot spoof attribution.
 * RLS policy: INSERT is allowed when `(auth.uid() IS NULL AND user_id IS NULL) OR auth.uid() = user_id` —
 * feedback may be anonymous only when there is no signed-in session (user_id must be null);
 * authenticated users must self-attribute (user_id = auth.uid()) and cannot submit anonymously.
 * This helper always sets user_id from the current session when available.
 * Accepts an optional pre-existing client to avoid creating a second instance.
 */
export async function submitFeedback(
  payload: SubmitFeedbackPayload,
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<void> {
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('Failed to retrieve authenticated user for feedback submission:', authError)
  }
  const { error } = await supabase.from('feedback').insert({
    ...payload,
    user_id: data?.user?.id ?? null,
  })
  if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
}
