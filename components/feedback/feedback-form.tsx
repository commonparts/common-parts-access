'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback } from '@/lib/supabase/queries/feedback'

type FeedbackType = 'bug' | 'improvement' | 'question' | 'other'

const FEEDBACK_TYPES: { value: FeedbackType; label: string; description: string }[] = [
  { value: 'bug',         label: 'Bug',         description: 'Something is broken' },
  { value: 'improvement', label: 'Improvement', description: 'A feature or enhancement' },
  { value: 'question',    label: 'Question',    description: 'I need clarification' },
  { value: 'other',       label: 'Other',       description: 'Anything else' },
]

interface FeedbackFormProps {
  onClose?: () => void
}

export function FeedbackForm({ onClose }: FeedbackFormProps) {
  const supabase = createClient()

  const [type, setType]               = useState<FeedbackType>('improvement')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [email, setEmail]             = useState('')
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    setStatus('loading')

    const { data, error: authError } = await supabase.auth.getUser()
    const user = data?.user ?? null
    if (authError) {
      console.error('Failed to retrieve authenticated user for feedback submission:', authError)
    }

    try {
      await submitFeedback({
        type,
        title:       title.trim(),
        description: description.trim(),
        email:       email.trim() || null,
        user_id:     user?.id ?? null,
        url:         typeof window !== 'undefined' ? window.location.href : null,
        user_agent:  typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }, supabase)
      setStatus('success')
      setTimeout(() => onClose?.(), 2000)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center p-lg">
        <p className="text-body text-text-secondary">Feedback received. Thank you.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-sm p-md">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-xs">
        {FEEDBACK_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-lg border px-sm py-xs text-left text-sm transition-colors ${
              type === t.value
                ? 'border-border-default bg-bg-subtle text-text-primary'
                : 'border-border-subtle text-text-secondary hover:border-border-default hover:bg-bg-hover'
            }`}
          >
            <div className="font-medium">{t.label}</div>
            <div className="text-xs text-text-secondary">{t.description}</div>
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-xs">
        <Label htmlFor="feedback-title">Title</Label>
        <Input
          id="feedback-title"
          placeholder="Short title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-xs">
        <Label htmlFor="feedback-description">Description</Label>
        <Textarea
          id="feedback-description"
          placeholder="Describe the issue or idea..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={4}
        />
      </div>

      {/* Email (optional) */}
      <div className="flex flex-col gap-xs">
        <Label htmlFor="feedback-email">Email <span className="text-text-secondary font-normal">(optional)</span></Label>
        <Input
          id="feedback-email"
          type="email"
          placeholder="For follow-up"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-text-secondary">Something went wrong. Please try again.</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={status === 'loading' || !title.trim() || !description.trim()}
        className="w-full"
      >
        {status === 'loading' ? 'Sending...' : 'Submit feedback'}
      </Button>
    </div>
  )
}