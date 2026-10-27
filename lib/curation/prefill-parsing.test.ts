import { describe, expect, it } from 'vitest'
import {
  derivePrintablesPrintMetadata,
  derivePrintablesTexts,
  deriveThingiverseFields,
  parsePrintablesModelId,
  parseThingiverseThingId,
  type ThingiverseThing,
} from './prefill-parsing'

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

describe('derivePrintablesTexts', () => {
  it('maps the summary to the short description as-is', () => {
    const result = derivePrintablesTexts({
      summary:
        'Complete replacement clip for IKEA JANSJO lamp type V1431 (old design). The original rubber pads can be reused.',
    })
    expect(result.description).toBe(
      'Complete replacement clip for IKEA JANSJO lamp type V1431 (old design). The original rubber pads can be reused.',
    )
    expect(result.instructions).toBeNull()
  })

  it('converts the HTML description into plain-text instructions', () => {
    const result = derivePrintablesTexts({
      description:
        '<p>The clamp broke.</p><h3>Features</h3><ul><li>Complete Clamp (2 Parts).</li><li>Rubber pads reusable.</li></ul><figure><img src="https://example.com/x.png"></figure><p>Screw the stem in.</p>',
    })
    expect(result.instructions).toBe(
      'The clamp broke.\nFeatures\n- Complete Clamp (2 Parts).\n- Rubber pads reusable.\n\nScrew the stem in.',
    )
  })

  it('returns nulls for missing or whitespace-only content', () => {
    expect(derivePrintablesTexts({})).toEqual({ description: null, instructions: null })
    expect(derivePrintablesTexts({ summary: '  ', description: '<p>&nbsp;</p>' })).toEqual({
      description: null,
      instructions: null,
    })
  })

  it('caps over-limit text at the column limit instead of dropping it', () => {
    const result = derivePrintablesTexts({ summary: 'x'.repeat(300) })
    expect(result.description).toHaveLength(250)
  })
})

describe('parseThingiverseThingId', () => {
  it('parses the canonical Thing URL, with or without www', () => {
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/thing:3161'))).toBe('3161')
    expect(parseThingiverseThingId(new URL('https://thingiverse.com/thing:3161'))).toBe('3161')
  })

  it('parses sub-paths, a trailing slash and query strings', () => {
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/thing:3161/files'))).toBe('3161')
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/thing:3161/comments/'))).toBe('3161')
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/thing:3161?utm_source=x'))).toBe('3161')
  })

  it('returns null for non-Thing pages', () => {
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/adafruit/designs'))).toBeNull()
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/thing:abc'))).toBeNull()
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/search?q=thing:3161'))).toBeNull()
    expect(parseThingiverseThingId(new URL('https://www.thingiverse.com/'))).toBeNull()
  })
})

/** Shape of a live GET /things/{id} response, trimmed to the fields read. */
function thing(overrides: Partial<ThingiverseThing> & { settings?: Record<string, unknown> } = {}): ThingiverseThing {
  const { settings, ...rest } = overrides
  return {
    creator: { name: 'maker_jane', public_url: 'https://www.thingiverse.com/maker_jane' },
    description_html: '<div><p>Replacement hinge for the lid.</p><ol><li>Print flat.</li><li>Press in.</li></ol></div>',
    license: 'Creative Commons - Attribution',
    details_parts: [
      { type: 'summary', data: [{ content: '<div><p>Replacement hinge for the lid.</p></div>' }] },
      {
        type: 'settings',
        data: [
          settings ?? {
            printer: '<div><p>Prusa MK4</p></div>',
            rafts: 'No',
            supports: 'Yes',
            resolution: '<div><p>0.2mm</p></div>',
            infill: '<div><p>20%</p></div>',
            filament_material: '<div><p>PETG</p></div>',
          },
        ],
      },
      { type: 'tips' },
      { type: 'design' },
    ],
    ...rest,
  }
}

describe('deriveThingiverseFields', () => {
  it('derives the author, instructions, print settings and license of a complete Thing', () => {
    expect(deriveThingiverseFields(thing())).toEqual({
      originalAuthor: 'maker_jane',
      originalAuthorUrl: 'https://www.thingiverse.com/maker_jane',
      instructions: 'Replacement hinge for the lid.\n- Print flat.\n- Press in.',
      material: 'PETG',
      layerHeight: '0.2',
      licenseSpdxId: 'CC-BY-4.0',
    })
  })

  it('maps the Summary to the instructions and never fills the short description', () => {
    const result = deriveThingiverseFields(thing())
    expect(result.instructions).toContain('Replacement hinge for the lid.')
    expect(result).not.toHaveProperty('description')
  })

  it('maps each license label whose Thing page links a version held in licenses', () => {
    for (const [license, expected] of [
      ['Creative Commons - Attribution', 'CC-BY-4.0'],
      ['Creative Commons - Attribution - Share Alike', 'CC-BY-SA-4.0'],
      ['Creative Commons - Attribution - No Derivatives', 'CC-BY-ND-4.0'],
      ['Creative Commons - Attribution - Non-Commercial', 'CC-BY-NC-4.0'],
      ['Creative Commons - Attribution - Non-Commercial - Share Alike', 'CC-BY-NC-SA-4.0'],
      ['Creative Commons - Attribution - Non-Commercial - No Derivatives', 'CC-BY-NC-ND-4.0'],
      ['Creative Commons - Public Domain Dedication', 'CC0-1.0'],
      [' Creative Commons - Attribution ', 'CC-BY-4.0'],
    ]) {
      expect(deriveThingiverseFields(thing({ license })).licenseSpdxId).toBe(expected)
    }
  })

  it('leaves the license empty when the label links another version or no exact license', () => {
    // Public Domain links the retired Public Domain Certification, GNU - GPL
    // links GPL 2.0, GNU - LGPL links LGPL 2.1, BSD License an unversioned
    // page; none has a licenses row (#431).
    for (const license of [
      'Public Domain',
      'GNU - GPL',
      'GNU - LGPL',
      'BSD License',
      'All Rights Reserved',
      'Some future license 4.0',
      'constructor',
      '',
      null,
    ]) {
      expect(deriveThingiverseFields(thing({ license })).licenseSpdxId).toBeNull()
    }
  })

  it('normalizes plain-number resolutions in millimetres', () => {
    for (const [resolution, expected] of [
      ['<div><p>.12</p></div>', '0.12'],
      ['<div><p>.2</p></div>', '0.2'],
      ['<div><p>0.1mm</p></div>', '0.1'],
      ['<div><p>0.28 MM</p></div>', '0.28'],
    ]) {
      expect(deriveThingiverseFields(thing({ settings: { resolution } })).layerHeight).toBe(expected)
    }
  })

  it('leaves the layer height empty when the resolution is not a plain value', () => {
    for (const resolution of [
      '<div><p>NA</p></div>',
      '<div><p>Varies</p></div>',
      '<div><p>0.3 (best) or 0.2 mm</p></div>',
      '<div><p>200</p></div>',
      '<div><p>0</p></div>',
    ]) {
      expect(deriveThingiverseFields(thing({ settings: { resolution } })).layerHeight).toBeNull()
    }
  })

  it('takes a single declared material and drops "not given" or ambiguous ones', () => {
    expect(deriveThingiverseFields(thing({ settings: { filament_material: '<div><p>NA</p></div>' } })).material).toBeNull()
    expect(
      deriveThingiverseFields(thing({ settings: { filament_material: '<div><p>PLA</p><p>PETG</p></div>' } })).material,
    ).toBeNull()
    expect(
      deriveThingiverseFields(thing({ settings: { filament_material: `<div><p>${'x'.repeat(101)}</p></div>` } }))
        .material,
    ).toBeNull()
  })

  it('requires every settings entry to agree on a value', () => {
    const result = deriveThingiverseFields(
      thing({
        details_parts: [
          { type: 'settings', data: [{ resolution: '0.2', filament_material: 'PLA' }, { resolution: '0.3', filament_material: 'PLA' }] },
        ],
      }),
    )
    expect(result.layerHeight).toBeNull()
    expect(result.material).toBe('PLA')
  })

  it('keeps the profile URL only when it is a Thingiverse https URL', () => {
    expect(
      deriveThingiverseFields(thing({ creator: { name: 'x', public_url: 'https://evil.example/x' } })).originalAuthorUrl,
    ).toBeNull()
    expect(
      deriveThingiverseFields(thing({ creator: { name: 'x', public_url: 'javascript:alert(1)' } })).originalAuthorUrl,
    ).toBeNull()
  })

  it('returns nulls for an empty or malformed Thing', () => {
    const empty = {
      originalAuthor: null,
      originalAuthorUrl: null,
      instructions: null,
      material: null,
      layerHeight: null,
      licenseSpdxId: null,
    }
    expect(deriveThingiverseFields({})).toEqual(empty)
    expect(
      deriveThingiverseFields({
        creator: null,
        description_html: '<div><p>&nbsp;</p></div>',
        license: null,
        details_parts: [null, { type: 'settings', data: [null, { resolution: 12 }] }],
      }),
    ).toEqual(empty)
  })

  it('caps the Summary at the instructions limit', () => {
    const result = deriveThingiverseFields(thing({ description_html: `<p>${'x'.repeat(9000)}</p>` }))
    expect(result.instructions).toHaveLength(8000)
  })
})
