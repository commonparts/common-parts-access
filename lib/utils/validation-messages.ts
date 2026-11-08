import type { Locale, Messages, useTranslations } from 'next-intl'
import { z } from 'zod'

type ValidationTranslations = ReturnType<typeof useTranslations<'Validation'>>
type FieldTranslations = ReturnType<typeof useTranslations<'Fields'>>

/** The same localized defaults apply in a form resolver and on the server. */
export function validationErrorMap(locale: Locale): z.core.$ZodErrorMap {
  const defaultMessage = z.locales[locale]().localeError
  return (issue) =>
    issue.code === 'invalid_type' && issue.input == null && issue.path?.length ? 'required' : defaultMessage(issue)
}

/** Labels a Zod issue with the existing Fields and Validation messages. */
export function validationMessage(
  issue: z.core.$ZodIssue,
  t: ValidationTranslations,
  fields: FieldTranslations,
): string {
  const key = issue.message as keyof Messages['Validation']
  const message = t.has(key) ? t(key, issue.code === 'custom' ? issue.params : undefined) : issue.message
  const field = issue.path
    .filter((segment) => typeof segment === 'string' && segment !== 'fields')
    .map((segment) => (fields.has(segment as keyof Messages['Fields']) ? fields(segment as keyof Messages['Fields']) : segment))
    .join(' › ')
  return field ? t('field', { field, message }) : message
}

/** Finds the first message in React Hook Form's nested field errors. */
export function firstFormError(errors: object): string | null {
  if ('message' in errors && typeof errors.message === 'string') return errors.message
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'ref' || !value || typeof value !== 'object') continue
    const message = firstFormError(value)
    if (message) return message
  }
  return null
}
