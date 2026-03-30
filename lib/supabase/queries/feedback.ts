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
 * RLS policy: current INSERT policy is `with check (true)`; the database does not validate user_id.
 * Accepts an optional pre-existing client to avoid creating a second instance.
 */
export async function submitFeedback(
  payload: SubmitFeedbackPayload,
  supabase: ReturnType<typeof createClient> = createClient(),
): Promise<void> {
  const { error } = await supabase.from('feedback').insert(payload)
  if (error) throw new Error(`Failed to submit feedback: ${error.message}`)
}
