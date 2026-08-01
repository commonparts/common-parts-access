import { describe, expect, it } from 'vitest'
import { describePublication } from './publication'

describe('describePublication', () => {
  it('labels a self-published part Original', () => {
    expect(describePublication('original', 'hosted').kind).toBe('original')
    expect(describePublication('original', 'hosted').badge).toBe('Original')
  })

  it('labels a part published elsewhere and hosted here Hosted', () => {
    expect(describePublication('curated', 'hosted').kind).toBe('hosted')
    expect(describePublication('curated', 'hosted').badge).toBe('Hosted')
  })

  it('labels a part whose files stay at the source Referenced', () => {
    expect(describePublication('curated', 'link_out').kind).toBe('referenced')
    expect(describePublication('curated', 'link_out').badge).toBe('Referenced')
  })

  // file_hosting_type is nullable on models, and rows predating the column
  // carry no value. Hosted is the safe reading: the badge must never claim
  // the files are elsewhere when the record does not say so.
  it('falls back to Hosted when the hosting type is absent', () => {
    expect(describePublication('curated', null).kind).toBe('hosted')
    expect(describePublication('curated', undefined).kind).toBe('hosted')
  })

  // The manufacturer origin is unused but present in the type union — it must
  // still resolve, and it is not someone else's publication.
  it('treats the unused manufacturer origin as Original', () => {
    expect(describePublication('manufacturer', 'hosted').kind).toBe('original')
  })

  // (original, link_out) is excluded by design: a self-designed part hosted
  // elsewhere goes through the elsewhere track. Should one ever exist, the
  // badge must not silently call it Referenced.
  it('keeps a self-published origin Original even if hosting says otherwise', () => {
    expect(describePublication('original', 'link_out').kind).toBe('original')
  })

  it('gives every kind a description that avoids storage vocabulary', () => {
    const forbidden = /curat|link.out|hosting type/i
    for (const label of [
      describePublication('original', 'hosted'),
      describePublication('curated', 'hosted'),
      describePublication('curated', 'link_out'),
    ]) {
      expect(label.description).not.toMatch(forbidden)
      expect(label.badge).not.toMatch(forbidden)
    }
  })
})
