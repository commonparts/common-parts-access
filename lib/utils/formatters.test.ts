import { describe, expect, it } from 'vitest'
import { formatRegionName, htmlToPlainText, splitPrintTime } from './formatters'

describe('splitPrintTime', () => {
  it('splits whole hours, minutes, and mixed durations', () => {
    expect(splitPrintTime(45)).toEqual({ hours: 0, minutes: 45 })
    expect(splitPrintTime(60)).toEqual({ hours: 1, minutes: 0 })
    expect(splitPrintTime(150)).toEqual({ hours: 2, minutes: 30 })
  })

  it('rounds fractional minutes without rolling up to 1 h 60 min', () => {
    expect(splitPrintTime(119.6)).toEqual({ hours: 2, minutes: 0 })
    expect(splitPrintTime(59.4)).toEqual({ hours: 0, minutes: 59 })
  })

  it('returns null for missing or non-positive values', () => {
    expect(splitPrintTime(null)).toBeNull()
    expect(splitPrintTime(undefined)).toBeNull()
    expect(splitPrintTime(0)).toBeNull()
    expect(splitPrintTime(-5)).toBeNull()
  })

  it('returns null instead of zero minutes for values that round to zero', () => {
    expect(splitPrintTime(0.4)).toBeNull()
  })

  it('returns null for non-finite values', () => {
    expect(splitPrintTime(Number.NaN)).toBeNull()
    expect(splitPrintTime(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('formatRegionName', () => {
  it('names the region in the given locale', () => {
    expect(formatRegionName('DE', 'en')).toBe('Germany')
    expect(formatRegionName('DE', 'fr')).toBe('Allemagne')
  })

  it('falls back to the code when it is not a region', () => {
    expect(formatRegionName('not-a-region', 'en')).toBe('not-a-region')
  })
})

describe('htmlToPlainText', () => {
  it('turns block ends and <br> into newlines and list items into bullets', () => {
    expect(htmlToPlainText('<p>One</p><p>Two<br>Three</p><ul><li>A</li><li>B</li></ul>')).toBe(
      'One\nTwo\nThree\n- A\n- B',
    )
  })

  it('strips remaining tags including images and attributes', () => {
    expect(htmlToPlainText('<figure class="x"><img src="https://e.com/i.png"></figure><p>Text</p>')).toBe('Text')
  })

  it('decodes common and numeric entities', () => {
    expect(htmlToPlainText('N&amp;B&nbsp;&lt;ok&gt; &quot;q&quot; &#39;a&#39; &#x41;')).toBe('N&B <ok> "q" \'a\' A')
  })

  it('collapses blank runs and trims the result', () => {
    expect(htmlToPlainText('<p>&nbsp;</p><p>A</p><p></p><p></p><p>B</p><p>&nbsp;</p>')).toBe('A\n\nB')
  })
})
