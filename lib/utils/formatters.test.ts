import { describe, expect, it } from 'vitest'
import { formatPrintTime, htmlToPlainText, pluralize } from './formatters'

describe('formatPrintTime', () => {
  it('formats whole hours, minutes, and mixed durations', () => {
    expect(formatPrintTime(45)).toBe('45m')
    expect(formatPrintTime(60)).toBe('1h')
    expect(formatPrintTime(150)).toBe('2h 30m')
  })

  it('rounds fractional minutes without rolling up to "1h 60m"', () => {
    expect(formatPrintTime(119.6)).toBe('2h')
    expect(formatPrintTime(59.4)).toBe('59m')
  })

  it('returns null for missing or non-positive values', () => {
    expect(formatPrintTime(null)).toBeNull()
    expect(formatPrintTime(undefined)).toBeNull()
    expect(formatPrintTime(0)).toBeNull()
    expect(formatPrintTime(-5)).toBeNull()
  })

  it('returns null instead of "0m" for values that round to zero', () => {
    expect(formatPrintTime(0.4)).toBeNull()
  })

  it('returns null for non-finite values', () => {
    expect(formatPrintTime(Number.NaN)).toBeNull()
    expect(formatPrintTime(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('pluralize', () => {
  it('keeps the singular noun for a count of 1', () => {
    expect(pluralize(1, 'part')).toBe('1 part')
  })

  it('pluralizes for other counts, including zero', () => {
    expect(pluralize(0, 'part')).toBe('0 parts')
    expect(pluralize(2, 'brand')).toBe('2 brands')
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
