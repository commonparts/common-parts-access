import { describe, expect, it } from 'vitest'
import { derivePrintablesPrintMetadata, parsePrintablesModelId } from './prefill-parsing'

describe('parsePrintablesModelId', () => {
  it('parses the canonical model URL', () => {
    expect(parsePrintablesModelId(new URL('https://www.printables.com/model/3161-3d-benchy'))).toBe('3161')
  })

  it('parses a bare id and deeper paths', () => {
    expect(parsePrintablesModelId(new URL('https://www.printables.com/model/3161'))).toBe('3161')
    expect(parsePrintablesModelId(new URL('https://www.printables.com/model/3161-3d-benchy/files'))).toBe('3161')
  })

  it('parses URLs with a leading locale segment', () => {
    expect(parsePrintablesModelId(new URL('https://www.printables.com/cs/model/3161-3d-benchy'))).toBe('3161')
  })

  it('returns null for non-model pages', () => {
    expect(parsePrintablesModelId(new URL('https://www.printables.com/@Prusa3D'))).toBeNull()
    expect(parsePrintablesModelId(new URL('https://www.printables.com/model/abc'))).toBeNull()
    expect(parsePrintablesModelId(new URL('https://www.printables.com/'))).toBeNull()
  })
})

describe('derivePrintablesPrintMetadata', () => {
  it('derives all fields from a complete print', () => {
    expect(
      derivePrintablesPrintMetadata({
        printDuration: '2.46',
        weight: '29.00',
        materials: [{ name: 'PLA' }],
        layerHeights: ['0.15'],
      }),
    ).toEqual({
      material: 'PLA',
      layerHeight: '0.15',
      // printDuration is decimal hours: 2.46 h → 148 min (rounded)
      estimatedPrintTime: '148',
      estimatedMaterialUsage: '29',
    })
  })

  it('joins distinct materials and deduplicates repeats', () => {
    const result = derivePrintablesPrintMetadata({
      materials: [{ name: 'PLA' }, { name: 'PETG' }, { name: 'PLA' }],
    })
    expect(result.material).toBe('PLA, PETG')
  })

  it('skips layer height when the gcodes disagree', () => {
    const result = derivePrintablesPrintMetadata({
      layerHeights: ['0.15', '0.28', '0.25'],
    })
    expect(result.layerHeight).toBeNull()
  })

  it('treats repeated identical layer heights as unambiguous', () => {
    const result = derivePrintablesPrintMetadata({
      layerHeights: ['0.15', '0.15'],
    })
    expect(result.layerHeight).toBe('0.15')
  })

  it('returns nulls for missing, malformed or non-positive values', () => {
    expect(derivePrintablesPrintMetadata({})).toEqual({
      material: null,
      layerHeight: null,
      estimatedPrintTime: null,
      estimatedMaterialUsage: null,
    })
    expect(
      derivePrintablesPrintMetadata({
        printDuration: 'soon',
        weight: '0',
        materials: [null, { name: '  ' }],
        layerHeights: ['-0.2'],
      }),
    ).toEqual({
      material: null,
      layerHeight: null,
      estimatedPrintTime: null,
      estimatedMaterialUsage: null,
    })
  })
})
