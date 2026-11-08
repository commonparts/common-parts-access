import { describe, expect, it, vi } from 'vitest'
import { createTranslator, type Locale } from 'next-intl'
import { createFormControl } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EMPTY_PUBLISH_FORM, draftSubmission, publishFormSchema, type PublishFormContext } from './form'
import { savePublicationSchema } from '@/lib/schemas/publish'
import { validationErrorMap, validationMessage } from '@/lib/utils/validation-messages'
import { PUBLISH_STEPS } from './steps'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'

const id = '11111111-1111-4111-8111-111111111111'
const original = { track: 'original', step: PUBLISH_STEPS.ORIGIN, draftId: null } satisfies PublishFormContext
const elsewhere = { ...original, track: 'elsewhere' } satisfies PublishFormContext
const values = { ...EMPTY_PUBLISH_FORM, title: 'Hinge', categoryId: id, licenseId: id, attested: true,
  sourceUrl: 'https://www.printables.com/model/1', sourcePlatform: 'printables', originalAuthor: 'Designer' }

function translations(locale: Locale) {
  const messages = locale === 'fr' ? fr : en
  return {
    validation: createTranslator({ locale, messages, namespace: 'Validation' }),
    fields: createTranslator({ locale, messages, namespace: 'Fields' }),
  }
}

function schema(context: PublishFormContext, locale: Locale = 'en') {
  const { validation, fields } = translations(locale)
  return publishFormSchema(context, locale, validation, fields)
}

describe('publication form resolver', () => {
  it.each([original, elsewhere])('allows an incomplete future step when creating a $track draft', (context) => {
    expect(schema(context).safeParse(values).success).toBe(true)
    expect(savePublicationSchema.safeParse(draftSubmission(values, context)).success).toBe(true)
  })

  it.each(['en', 'fr'] as const)('shows the same field labels and Zod messages as the server in %s', (locale) => {
    const input = { ...values, title: 'ab' }
    const server = savePublicationSchema.safeParse(draftSubmission(input, original), { error: validationErrorMap(locale) })
    const client = schema(original, locale).safeParse(input)
    if (server.success || client.success) throw new Error('Expected both validators to refuse the title')
    const { validation, fields } = translations(locale)
    expect(client.error.issues[0].message).toBe(validationMessage(server.error.issues[0], validation, fields))
    expect(client.error.issues[0].path).toEqual(['title'])
  })

  it('does not turn an unchecked declaration into a true attestation', () => {
    const parsed = schema(original).safeParse({ ...values, attested: false })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].message).toMatch(/Must be confirmed/)
  })

  it('keeps the elsewhere license explicit and validates the author URL', () => {
    expect(schema(elsewhere).safeParse({ ...values, licenseId: '' }).success).toBe(false)
    expect(schema(elsewhere).safeParse({ ...values, originalAuthorUrl: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('maps metadata errors back to the registered flat input, without changing the payload parser', () => {
    const context = { ...original, draftId: id, step: PUBLISH_STEPS.DETAILS }
    const parsed = schema(context).safeParse({ ...values, infill: '101' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(['infill'])
    expect(schema(context).safeParse({ ...values, estimatedPrintTime: '1.5' }).success).toBe(false)
  })

  it('preserves cleared metadata through client validation, then parses it on the server', () => {
    const context = { ...original, draftId: id, step: PUBLISH_STEPS.DETAILS }
    const parsed = savePublicationSchema.parse(draftSubmission(values, context))
    expect(parsed.fields).toMatchObject({ description: null, dimensions: null, print_settings: null, estimated_print_time: null })
  })

  it('saves only the current step and keeps incomplete judgements as draft data', () => {
    const files = { ...elsewhere, draftId: id, step: PUBLISH_STEPS.FILES }
    expect(draftSubmission(values, files)).toEqual({ operation: 'updateElsewhere', id,
      fields: { checklist: {}, needs_photo: true } })
    expect(schema(files).safeParse(values).success).toBe(true)
    expect(draftSubmission(values, { ...original, draftId: id, step: PUBLISH_STEPS.FILES })).toBeNull()
  })

  it('retains entered values when registered inputs unmount between steps', async () => {
    const control = createFormControl({ defaultValues: values, resolver: zodResolver(schema(original)) })
    const unsubscribe = control.subscribe({ formState: { values: true }, callback: () => {} })
    const title = control.register('title')
    title.ref({ name: 'title', value: 'Hinge', type: 'text' })
    control.setValue('title', 'Replacement hinge')
    title.ref(null)
    control.register('description')
    control.setValue('description', 'Fits the old bracket')
    const saved = vi.fn()
    await control.handleSubmit(saved)()
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ title: 'Replacement hinge', description: 'Fits the old bracket' }), undefined)
    unsubscribe()
  })

  it('uses React Hook Form errors to stop an invalid submission before any action', async () => {
    const control = createFormControl({ defaultValues: { ...values, attested: false }, resolver: zodResolver(schema(original)) })
    const saved = vi.fn()
    const invalid = vi.fn()
    await control.handleSubmit(saved, invalid)()
    expect(saved).not.toHaveBeenCalled()
    expect(invalid).toHaveBeenCalledWith(expect.objectContaining({ attested: expect.objectContaining({ message: expect.stringContaining('Must be confirmed') }) }), undefined)
  })
})
