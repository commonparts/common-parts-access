'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback } from '@/lib/supabase/queries/feedback'

type FeedbackType = 'bug' | 'improvement' | 'question' | 'other'

// Each type has a label and a description in the `Feedback.types` messages.
const FEEDBACK_TYPES: FeedbackType[] = ['bug', 'improvement', 'question', 'other']

interface FeedbackFormProps {
  onClose?: () => void
}

export function FeedbackForm({ onClose }: FeedbackFormProps) {
  const t = useTranslations('Feedback')
  const supabase = useMemo(() => createClient(), [])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const [type, setType]               = useState<FeedbackType>('improvement')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    setStatus('loading')

    try {
      await submitFeedback({
        type,
        title:       title.trim(),
        description: description.trim(),
        url:         typeof window !== 'undefined' ? window.location.href : null,
      }, supabase)
      setStatus('success')
      closeTimerRef.current = setTimeout(() => onClose?.(), 2000)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center p-lg">
        <p className="text-body text-text-secondary">{t('done')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-sm p-md">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-xs">
        {FEEDBACK_TYPES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`rounded-lg border px-sm py-xs text-left text-sm transition-colors ${
              type === value
                ? 'border-border-default bg-bg-subtle text-text-primary'
                : 'border-border-subtle text-text-secondary hover:border-border-default hover:bg-bg-hover'
            }`}
          >
            <div className="font-medium">{t(`types.${value}.label`)}</div>
            <div className="text-xs text-text-secondary">{t(`types.${value}.description`)}</div>
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-xs">
        <Label htmlFor="feedback-title">{t('titleLabel')}</Label>
        <Input
          id="feedback-title"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-xs">
        <Label htmlFor="feedback-description">{t('descriptionLabel')}</Label>
        <Textarea
          id="feedback-description"
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={4}
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-status-errorText">{t('failed')}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={status === 'loading' || !title.trim() || !description.trim()}
        className="w-full"
      >
        {t(status === 'loading' ? 'sending' : 'submit')}
      </Button>
    </div>
  )
}