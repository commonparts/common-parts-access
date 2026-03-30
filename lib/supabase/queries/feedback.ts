import { createClient } from '@/lib/supabase/client'

type FeedbackType = 'bug' | 'improvement' | 'question' | 'other'

interface SubmitFeedbackPayload {
  type: FeedbackType
  title: string
  description: string
  email: string | null
  user_id: string | null
  url: string | null
  user_agent: string | null
}

/**
 * Inserts a feedback record into the feedback table.
 * Called from the client-side feedback widget.
 * RLS policy: anyone can insert (user_id must match auth.uid() or be null).
 */
export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('feedback').insert(payload)
  if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
}
