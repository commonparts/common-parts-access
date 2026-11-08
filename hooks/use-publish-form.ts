import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { publishFormSchema, EMPTY_PUBLISH_FORM, draftSubmission, type PublishFormContext, type PublishFormValues } from '@/lib/publish/form'
import { savePublication } from '@/lib/actions/publish'
import type { DraftIdentity, SavePublicationResult } from '@/lib/publish/results'
import { firstFormError } from '@/lib/utils/validation-messages'

interface PublishForm extends UseFormReturn<PublishFormValues> {
  formData: PublishFormValues
  setFormError: (message: string | null) => void
  submit: (onCreated: (draft: DraftIdentity) => void) => Promise<SavePublicationResult>
  error: string | null
  saving: boolean
}

/** Keeps values across unmounted steps and validates only the step being saved. */
export function usePublishForm(context: PublishFormContext): PublishForm {
  const locale = useLocale()
  const validation = useTranslations('Validation')
  const fields = useTranslations('Fields')
  const flow = useTranslations('PublishFlow')
  const schema = publishFormSchema(context, locale, validation, fields)
  const methods = useForm({
    defaultValues: { ...EMPTY_PUBLISH_FORM, attested: Boolean(context.draftId) },
    resolver: zodResolver(schema),
  })
  const { setError, clearErrors } = methods
  const formData = useWatch({ control: methods.control, compute: (values) => values })
  const setFormError = React.useCallback((message: string | null): void => {
    if (message) setError('root', { message })
    else clearErrors()
  }, [setError, clearErrors])

  /** React Hook Form owns validation, pending state and errors for every save. */
  const submit = async (onCreated: (draft: DraftIdentity) => void): Promise<SavePublicationResult> => {
    clearErrors()
    let result: SavePublicationResult = { ok: true, data: null }
    await methods.handleSubmit(async (values) => {
      const payload = draftSubmission(values, context)
      if (!payload) return
      try {
        result = await savePublication(payload)
        if (result.ok && result.data) {
          onCreated(result.data)
          // A new elsewhere draft also persists the category and judgements
          // made before its id existed. Keep its id if this second save fails.
          if (context.track === 'elsewhere') {
            const initial = draftSubmission(values, { ...context, draftId: result.data.id })
            if (initial) result = await savePublication(initial)
          }
        }
        if (!result.ok) setFormError(result.error)
      } catch {
        result = { ok: false, error: flow('saveFailed') }
        setFormError(result.error)
      }
    }, (errors) => { result = { ok: false, error: firstFormError(errors) ?? validation('invalidRequest') } })()
    return result
  }
  return { ...methods, formData, setFormError, submit,
    error: firstFormError(methods.formState.errors), saving: methods.formState.isSubmitting }
}
