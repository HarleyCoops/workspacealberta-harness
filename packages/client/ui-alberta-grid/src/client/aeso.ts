/** Read-only AESO-shaped CSV parsers for Railway CSD + pool price feeds. */

export const CSD_URL = 'https://web-production-02936.up.railway.app/api/csd'
export const PRICE_URL = 'https://web-production-02936.up.railway.app/api/price'

export interface FuelRow {
  readonly name: string
  readonly mc: number
  readonly tng: number
  readonly dcr: number
}

export interface IntertieRow {
  readonly name: string
  readonly mw: number
}

export interface CsdSnapshot {
  readonly lastUpdate: string | null
  readonly ail: number
  readonly totalNetGeneration: number
  readonly netActualInterchange: number
  readonly fuels: readonly FuelRow[]
  readonly interties: readonly IntertieRow[]
}

export interface PriceSnapshot {
  readonly dateHe: string
  readonly price: number
  readonly ravg30: number | null
  readonly ailDemand: number | null
}

export interface GridSnapshot {
  readonly csd: CsdSnapshot
  readonly price: PriceSnapshot | null
  readonly fetchedAt: number
}

function unquote(cell: string): string {
  const t = cell.trim()
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1).replace(/""/g, '"')
  return t
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (ch === '"') { inQ = false; continue }
      cur += ch
      continue
    }
    if (ch === '"') { inQ = true; continue }
    if (ch === ',') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map(unquote)
}

function num(value: string | undefined): number | null {
  if (value === undefined) return null
  const t = value.trim()
  if (t === '' || t === '-') return null
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const FUEL_NAMES = new Set([
  'COGENERATION', 'WIND', 'COMBINED CYCLE', 'GAS FIRED STEAM', 'SOLAR',
  'SIMPLE CYCLE', 'HYDRO', 'OTHER', 'ENERGY STORAGE',
])

/**
 * Parse Current Supply Demand report text into a typed snapshot.
 */
export function parseCsd(text: string): CsdSnapshot {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let lastUpdate: string | null = null
  let ail = 0
  let totalNetGeneration = 0
  let netActualInterchange = 0
  const fuels: FuelRow[] = []
  const interties: IntertieRow[] = []
  let inAssetBlock = false

  for (const line of lines) {
    if (line.toLowerCase().includes('last update')) {
      const m = line.match(/Last Update\s*:\s*(.+?)"?$/i) ?? line.match(/Last Update\s*:\s*(.+)$/i)
      if (m) lastUpdate = m[1]!.replace(/"/g, '').trim()
      continue
    }
    const cells = parseCsvLine(line)
    if (cells.length === 0) continue
    const key = cells[0] ?? ''
    if (key === 'ASSET' || key.includes('<center>')) { inAssetBlock = true; continue }
    if (inAssetBlock) continue

    if (key === 'Alberta Internal Load (AIL)') {
      const v = num(cells[1]); if (v !== null) ail = v
      continue
    }
    if (key === 'Alberta Total Net Generation') {
      const v = num(cells[1]); if (v !== null) totalNetGeneration = v
      continue
    }
    if (key === 'Net Actual Interchange') {
      const v = num(cells[1]); if (v !== null) netActualInterchange = v
      continue
    }
    if (FUEL_NAMES.has(key) && cells.length >= 3) {
      const mc = num(cells[1]) ?? 0
      const tng = num(cells[2]) ?? 0
      const dcr = num(cells[3]) ?? 0
      fuels.push({ name: key, mc, tng, dcr })
      continue
    }
    if ((key === 'British Columbia' || key === 'Montana' || key === 'Saskatchewan') && cells.length >= 2) {
      const mw = num(cells[1]) ?? 0
      interties.push({ name: key, mw })
    }
  }

  return { lastUpdate, ail, totalNetGeneration, netActualInterchange, fuels, interties }
}

/**
 * Parse pool price CSV; newest-first; skip dash rows; return latest numeric price.
 */
export function parsePrice(text: string): PriceSnapshot | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let seenHeader = false
  for (const line of lines) {
    if (!seenHeader) {
      if (line.includes('Date (HE)') && line.includes('Price')) seenHeader = true
      continue
    }
    const cells = parseCsvLine(line)
    if (cells.length < 2) continue
    const price = num(cells[1])
    if (price === null) continue
    return {
      dateHe: cells[0] ?? '',
      price,
      ravg30: num(cells[2]),
      ailDemand: num(cells[3]),
    }
  }
  return null
}

/** Fuel towers shown in the viz (aggregated gas). */
export interface FuelTower {
  readonly id: string
  readonly label: string
  readonly tng: number
  readonly note?: string
}

export function fuelTowers(fuels: readonly FuelRow[]): FuelTower[] {
  const by = new Map(fuels.map(f => [f.name, f]))
  const tng = (name: string) => by.get(name)?.tng ?? 0
  const gas = tng('COGENERATION') + tng('COMBINED CYCLE') + tng('GAS FIRED STEAM') + tng('SIMPLE CYCLE')
  const solar = tng('SOLAR')
  return [
    { id: 'solar', label: 'Solar', tng: solar, note: 'AESO-visible (>5 MW)' },
    { id: 'wind', label: 'Wind', tng: tng('WIND') },
    { id: 'gas', label: 'Gas', tng: gas },
    { id: 'hydro', label: 'Hydro+Other', tng: tng('HYDRO') + tng('OTHER') },
    { id: 'storage', label: 'Storage', tng: tng('ENERGY STORAGE') },
  ]
}

/** BC + Montana intertie net MW (positive = export from Alberta). */
export function westIntertieMw(interties: readonly IntertieRow[]): number {
  let sum = 0
  for (const row of interties) {
    if (row.name === 'British Columbia' || row.name === 'Montana') sum += row.mw
  }
  return sum
}

export async function fetchGrid(): Promise<GridSnapshot> {
  const [csdText, priceText] = await Promise.all([
    fetch(CSD_URL, { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error(`CSD HTTP ${r.status}`)
      return r.text()
    }),
    fetch(PRICE_URL, { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error(`Price HTTP ${r.status}`)
      return r.text()
    }),
  ])
  return {
    csd: parseCsd(csdText),
    price: parsePrice(priceText),
    fetchedAt: Date.now(),
  }
}

/** Pool price band for HUD / pulse colour. */
export function priceBand(price: number): 'cool' | 'amber' | 'hot' {
  if (price < 40) return 'cool'
  if (price < 100) return 'amber'
  return 'hot'
}
