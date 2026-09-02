import { describe, expect, it } from 'vitest'
import { parseCsd } from '../src/client/aeso.ts'
import {
  FUEL_COLORS, POLL_MS, PRICE_SCALE_MAX, formatMw, formatPctOfLoad, formatPrice,
  fuelBarSpecs, intertieBarSpecs, orbitMode, orbitNoteKey, pollStatus, preferLiteScene,
  priceColor, priceMarker, tooltipOffset,
} from '../src/client/encodings.ts'
import { CSD_FIXTURE } from './fixtures.ts'

describe('fuelBarSpecs', () => {
  it('aligns five bars from a shared 0 baseline with MW and % of AIL', () => {
    const csd = parseCsd(CSD_FIXTURE)
    const bars = fuelBarSpecs(csd.fuels, csd.ail)
    expect(bars.map(row => row.id)).toEqual(['solar', 'wind', 'gas', 'hydro', 'storage'])
    const gas = bars.find(row => row.id === 'gas')!
    const solar = bars.find(row => row.id === 'solar')!
    const storage = bars.find(row => row.id === 'storage')!
    expect(gas.length).toBe(1)
    expect(solar.length).toBeCloseTo(290 / gas.mw)
    expect(storage.length).toBe(0)
    expect(solar.pctOfLoad).toBeCloseTo((290 / 10354) * 100)
    expect(storage.pctOfLoad).toBe(0)
    expect(solar.color).toBe(FUEL_COLORS.solar)
    expect(gas.label).toContain('cogen+CC+steam+SC')
  })

  it('omits % of load when AIL is 0 and still keeps a shared scale', () => {
    const bars = fuelBarSpecs([], 0)
    expect(bars).toHaveLength(5)
    expect(bars.every(row => row.mw === 0 && row.length === 0 && row.pctOfLoad === null)).toBe(true)
  })
})

describe('intertieBarSpecs', () => {
  it('places import left of 0 and export right of 0 on one |MW| scale', () => {
    const specs = intertieBarSpecs(parseCsd(CSD_FIXTURE).interties)
    expect(specs.map(row => row.id)).toEqual(['bc', 'montana', 'west'])
    const bc = specs[0]!
    const montana = specs[1]!
    const west = specs[2]!
    expect(bc.side).toBe('export')
    expect(montana.side).toBe('import')
    expect(west.side).toBe('export')
    expect(west.mw).toBe(49)
    expect(bc.length).toBe(1)
    expect(montana.length).toBeCloseTo(19 / 68)
  })

  it('marks a zero interchange as a zero-length bar', () => {
    const [bc] = intertieBarSpecs([])
    expect(bc).toEqual({ id: 'bc', label: 'British Columbia', mw: 0, side: 'zero', length: 0 })
  })
})

describe('price ramp', () => {
  it('moves from cool blue through amber to hot without a rainbow', () => {
    expect(priceColor(0)).toBe('rgb(0, 114, 178)')
    expect(priceColor(40)).toBe('rgb(230, 159, 0)')
    expect(priceColor(100)).toBe('rgb(213, 94, 0)')
    expect(priceColor(PRICE_SCALE_MAX)).toBe('rgb(136, 34, 85)')
    expect(priceColor(999)).toBe('rgb(136, 34, 85)')
    expect(priceMarker(0)).toBe(0)
    expect(priceMarker(200)).toBeCloseTo(0.5)
    expect(priceMarker(800)).toBe(1)
  })
})

describe('pollStatus', () => {
  it('reports loading, live, stale, and error without a CSD stamp', () => {
    expect(pollStatus({ fetchedAt: null, now: 10, error: null, loading: true })).toBe('loading')
    expect(pollStatus({ fetchedAt: null, now: 10, error: null, loading: false })).toBe('loading')
    expect(pollStatus({ fetchedAt: null, now: 10, error: 'down', loading: false })).toBe('error')
    expect(pollStatus({ fetchedAt: 1, now: 2, error: null, loading: false })).toBe('live')
    expect(pollStatus({ fetchedAt: 1, now: 2, error: 'later', loading: false })).toBe('stale')
    expect(pollStatus({ fetchedAt: 1, now: 1 + POLL_MS * 2 + 1, error: null, loading: false })).toBe('stale')
    expect(pollStatus({ fetchedAt: 1, now: 5, error: null, loading: false, staleAfterMs: 3 })).toBe('stale')
  })
})

describe('preferLiteScene', () => {
  it('treats a lite query flag as the 2D-only path', () => {
    expect(preferLiteScene('?lite')).toBe(true)
    expect(preferLiteScene('?lite=1')).toBe(true)
    expect(preferLiteScene('?foo=1')).toBe(false)
    expect(preferLiteScene('')).toBe(false)
    expect(preferLiteScene()).toBe(false)
  })
})

describe('orbit helpers', () => {
  it('names the orbit note and stage flag', () => {
    expect(orbitNoteKey(true)).toBe('hud.orbitHint')
    expect(orbitNoteKey(false)).toBe('hud.fallback')
    expect(orbitMode(true)).toBe('on')
    expect(orbitMode(false)).toBe('off')
  })
})

describe('tooltipOffset', () => {
  it('falls back to the element box when the Grid root is absent', () => {
    const el = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 40 }),
    } as HTMLElement
    expect(tooltipOffset(el, null)).toEqual({ x: 30, y: 20 })
    const root = {
      getBoundingClientRect: () => ({ left: 4, top: 6 }),
    } as Element
    expect(tooltipOffset(el, root)).toEqual({ x: 26, y: 14 })
  })
})

describe('formatters', () => {
  it('prints MW, % of AIL, and $/MWh', () => {
    expect(formatMw(10354)).toBe('10,354 MW')
    expect(formatPctOfLoad(11.412)).toBe('11.4% of AIL')
    expect(formatPrice(13.9)).toBe('$13.90/MWh')
  })
})
