import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CSD_URL, PRICE_URL, fetchGrid, fuelTowers, parseCsd, parsePrice, priceBand, westIntertieMw,
} from '../src/client/aeso.ts'
import { CSD_FIXTURE, PRICE_EMPTY, PRICE_FIXTURE } from './fixtures.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseCsd', () => {
  it('reads AIL, fuels, interties, and the unused last-update field', () => {
    const snap = parseCsd(CSD_FIXTURE)
    expect(snap.lastUpdate).toBe('Sep 02, 2026 08:05')
    expect(snap.ail).toBe(10354)
    expect(snap.totalNetGeneration).toBe(10425)
    expect(snap.netActualInterchange).toBe(71)
    expect(snap.fuels).toEqual(expect.arrayContaining([
      { name: 'SOLAR', mc: 1892, tng: 290, dcr: 0 },
      { name: 'ENERGY STORAGE', mc: 270, tng: 0, dcr: 120 },
    ]))
    expect(snap.interties).toEqual([
      { name: 'British Columbia', mw: 68 },
      { name: 'Montana', mw: -19 },
      { name: 'Saskatchewan', mw: 22 },
    ])
  })

  it('skips the ASSET block and quoted empties', () => {
    const snap = parseCsd([
      'Last Update :  "now"',
      'Last Update without a colon',
      'Alberta Internal Load (AIL),',
      'Alberta Total Net Generation,not-a-number',
      'Net Actual Interchange,',
      'COGENERATION,-,12,',
      'WIND,"""q""",-,foo',
      'SOLAR,1,2',
      'British Columbia,-',
      'Montana',
      'Saskatchewan,1',
      'ASSET,MC,TNG,DCR',
      'Cloverbar,48,9,0',
    ].join('\n'))
    expect(snap.lastUpdate).toBe('now')
    expect(snap.ail).toBe(0)
    expect(snap.totalNetGeneration).toBe(0)
    expect(snap.netActualInterchange).toBe(0)
    expect(snap.fuels).toEqual(expect.arrayContaining([
      { name: 'COGENERATION', mc: 0, tng: 12, dcr: 0 },
      { name: 'WIND', mc: 0, tng: 0, dcr: 0 },
      { name: 'SOLAR', mc: 1, tng: 2, dcr: 0 },
    ]))
    expect(snap.interties).toEqual([
      { name: 'British Columbia', mw: 0 },
      { name: 'Saskatchewan', mw: 1 },
    ])
  })
})

describe('parsePrice', () => {
  it('returns the newest numeric row and skips dashes', () => {
    expect(parsePrice(PRICE_FIXTURE)).toEqual({
      dateHe: '09/02/2026 07',
      price: 13.90,
      ravg30: 50.08,
      ailDemand: 9914,
    })
  })

  it('returns null when every price cell is a dash or the header is missing', () => {
    expect(parsePrice(PRICE_EMPTY)).toBeNull()
    expect(parsePrice('not a price table\n1,2')).toBeNull()
    expect(parsePrice('Date (HE),Price\nonlyone\n"09/02/2026 07",-')).toBeNull()
  })
})

describe('aggregations', () => {
  it('folds gas and hydro+other, and nets BC+Montana', () => {
    const fuels = parseCsd(CSD_FIXTURE).fuels
    const towers = fuelTowers(fuels)
    expect(towers.map(row => [row.id, row.tng])).toEqual([
      ['solar', 290],
      ['wind', 1621],
      ['gas', 4193 + 2971 + 712 + 149],
      ['hydro', 259 + 230],
      ['storage', 0],
    ])
    expect(towers.find(row => row.id === 'solar')?.note).toMatch(/>5 MW/)
    expect(westIntertieMw(parseCsd(CSD_FIXTURE).interties)).toBe(49)
    expect(westIntertieMw([])).toBe(0)
  })

  it('classifies pool-price bands', () => {
    expect(priceBand(13.9)).toBe('cool')
    expect(priceBand(40)).toBe('amber')
    expect(priceBand(99.9)).toBe('amber')
    expect(priceBand(100)).toBe('hot')
  })
})

describe('fetchGrid', () => {
  it('parses both feeds and stamps fetchedAt', async () => {
    const now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const body = url === CSD_URL ? CSD_FIXTURE : PRICE_FIXTURE
      return new Response(body, { status: 200 })
    }))
    const snap = await fetchGrid()
    expect(snap.csd.ail).toBe(10354)
    expect(snap.price?.price).toBe(13.9)
    expect(snap.fetchedAt).toBe(now)
    expect(vi.mocked(fetch).mock.calls.map(call => call[0])).toEqual([CSD_URL, PRICE_URL])
  })

  it('throws on a non-OK CSD or price response', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === CSD_URL) return new Response('nope', { status: 503 })
      return new Response(PRICE_FIXTURE, { status: 200 })
    }))
    await expect(fetchGrid()).rejects.toThrow('CSD HTTP 503')

    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === PRICE_URL) return new Response('nope', { status: 502 })
      return new Response(CSD_FIXTURE, { status: 200 })
    }))
    await expect(fetchGrid()).rejects.toThrow('Price HTTP 502')
  })
})
