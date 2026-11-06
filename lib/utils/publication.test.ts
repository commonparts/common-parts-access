import { describe, expect, it } from 'vitest'

import en from '@/messages/en.json'
import fr from '@/messages/fr.json'

import { describePublication } from './publication'

describe('describePublication', () => {
  it('labels a self-published part Original', () => {
    expect(describePublication('original', 'hosted')).toBe('original')
  })

  it('labels a part published elsewhere and hosted here Hosted', () => {
    expect(describePublication('curated', 'hosted')).toBe('hosted')
  })

  it('labels a part whose files stay at the source Referenced', () => {
    expect(describePublication('curated', 'link_out')).toBe('referenced')
  })

  // file_hosting_type is nullable on parts, and rows predating the column
  // carry no value. Hosted is the safe reading: the badge must never claim
  // the files are elsewhere when the record does not say so.
  it('falls back to Hosted when the hosting type is absent', () => {
    expect(describePublication('curated', null)).toBe('hosted')
    expect(describePublication('curated', undefined)).toBe('hosted')
  })

  // The manufacturer origin is unused but present in the type union — it must
  // still resolve, and it is not someone else's publication.
  it('treats the unused manufacturer origin as Original', () => {
    expect(describePublication('manufacturer', 'hosted')).toBe('original')
  })

  // (original, link_out) is excluded by design: a self-designed part hosted
  // elsewhere goes through the elsewhere track. Should one ever exist, the
  // badge must not silently call it Referenced.
  it('keeps a self-published origin Original even if hosting says otherwise', () => {
    expect(describePublication('original', 'link_out')).toBe('original')
  })
})

describe('Publication messages', () => {
  it('describe every kind without storage vocabulary', () => {
    const forbidden = /curat|link.out|hosting type/i
    for (const messages of [en.Publication, fr.Publication]) {
      for (const kind of ['original', 'hosted', 'referenced'] as const) {
        expect(messages[kind].badge).not.toMatch(forbidden)
        expect(messages[kind].description).not.toMatch(forbidden)
      }
    }
  })
})
