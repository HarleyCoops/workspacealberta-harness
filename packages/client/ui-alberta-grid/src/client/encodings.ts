/**
 * Wilke-honest encodings for Alberta Grid v2.
 *
 * Fuel comparison uses aligned lengths from a shared 0 baseline (Fundamentals
 * of Data Visualization ch.17). Fuel hues are qualitative Okabe–Ito-like
 * (ch.4). Pool price uses a cool–amber–hot sequential/diverging ramp, never
 * rainbow and never bloom-as-magnitude. Intertie uses signed position from 0.
 * Critical comparisons stay invertible in 2D (ch.26); 3D is an optional orbit
 * metaphor that reuses these same colors.
 *
 * @module @workspacealberta/ui-alberta-grid/encodings
 */

import {
  fuelTowers,
  westIntertieMw,
  type FuelRow,
  type IntertieRow,
} from './aeso.ts'

/** Closed fuel-group ids shown on the shared-baseline chart. */
export type FuelId = 'solar' | 'wind' | 'gas' | 'hydro' | 'storage'

/** Okabe–Ito-like qualitative hues, shared by the 2D bars, legend, and 3D. */
export const FUEL_COLORS: Record<FuelId, string> = {
  solar: '#E69F00',
  wind: '#56B4E9',
  gas: '#D55E00',
  hydro: '#009E73',
  storage: '#CC79A7',
}

/** Poll interval (ms). Deployment-visible; stays inside 60–120s. */
export const POLL_MS = 90_000

/** Cool / amber / hot thresholds in $/MWh. */
export const PRICE_COOL_MAX = 40
export const PRICE_AMBER_MAX = 100
/** Painted linear scale domain (AESO can print higher; the numeric stays exact). */
export const PRICE_SCALE_MAX = 400

interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

const COOL_LO: Rgb = { r: 0, g: 114, b: 178 }
const COOL_HI: Rgb = { r: 86, g: 180, b: 233 }
const AMBER: Rgb = { r: 230, g: 159, b: 0 }
const HOT_LO: Rgb = { r: 213, g: 94, b: 0 }
const HOT_HI: Rgb = { r: 136, g: 34, b: 85 }

function clamp01(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function mixRgb(a: Rgb, b: Rgb, t: number): string {
  const u = clamp01(t)
  const r = Math.round(a.r + (b.r - a.r) * u)
  const g = Math.round(a.g + (b.g - a.g) * u)
  const bch = Math.round(a.b + (b.b - a.b) * u)
  return `rgb(${r}, ${g}, ${bch})`
}

/**
 * Sequential/diverging pool-price color (cool under ~$40, amber mid, hot spikes).
 * @param price - pool price in $/MWh.
 * @returns a CSS color for the numeric and the scale marker.
 */
export function priceColor(price: number): string {
  if (price < PRICE_COOL_MAX) {
    return mixRgb(COOL_LO, COOL_HI, price / PRICE_COOL_MAX)
  }
  if (price < PRICE_AMBER_MAX) {
    return mixRgb(AMBER, HOT_LO, (price - PRICE_COOL_MAX) / (PRICE_AMBER_MAX - PRICE_COOL_MAX))
  }
  return mixRgb(HOT_LO, HOT_HI, (price - PRICE_AMBER_MAX) / (PRICE_SCALE_MAX - PRICE_AMBER_MAX))
}

/**
 * Marker position on the painted 0–PRICE_SCALE_MAX domain.
 * @param price - pool price in $/MWh.
 * @returns 0–1 inclusive; values above the painted max sit at 1.
 */
export function priceMarker(price: number): number {
  return clamp01(price / PRICE_SCALE_MAX)
}

/** One aligned fuel bar: length from 0, MW, and % of AIL. */
export interface FuelBarSpec {
  readonly id: FuelId
  readonly label: string
  readonly note?: string
  readonly mw: number
  readonly pctOfLoad: number | null
  readonly color: string
  /** 0–1 share of the shared max MW (never a truncated fill). */
  readonly length: number
}

/**
 * Build shared-baseline fuel bars. Length 0 is an honest empty category.
 * @param fuels - CSD fuel rows.
 * @param ail - Alberta Internal Load MW used for % labels.
 * @returns five bars in Solar / Wind / Gas / Hydro+Other / Storage order.
 */
export function fuelBarSpecs(fuels: readonly FuelRow[], ail: number): FuelBarSpec[] {
  const towers = fuelTowers(fuels)
  const maxMw = Math.max(1, ...towers.map(row => row.tng))
  return towers.map((row) => {
    const id = row.id as FuelId
    return {
      id,
      label: row.label,
      note: row.note,
      mw: row.tng,
      pctOfLoad: ail > 0 ? (row.tng / ail) * 100 : null,
      color: FUEL_COLORS[id],
      length: Math.max(0, row.tng) / maxMw,
    }
  })
}

/** One signed intertie bar: import left of 0, export right of 0. */
export interface IntertieBarSpec {
  readonly id: string
  readonly label: string
  readonly mw: number
  readonly side: 'import' | 'export' | 'zero'
  /** 0–1 share of the shared max |MW|. */
  readonly length: number
}

/**
 * Signed BC / Montana bars plus their net, sharing one |MW| scale from 0.
 * @param interties - CSD interchange rows.
 * @returns three specs (BC, Montana, BC+Montana net).
 */
export function intertieBarSpecs(interties: readonly IntertieRow[]): IntertieBarSpec[] {
  const by = new Map(interties.map(row => [row.name, row.mw]))
  const rows: ReadonlyArray<{ id: string; label: string; mw: number }> = [
    { id: 'bc', label: 'British Columbia', mw: by.get('British Columbia') ?? 0 },
    { id: 'montana', label: 'Montana', mw: by.get('Montana') ?? 0 },
    { id: 'west', label: 'BC+Montana net', mw: westIntertieMw(interties) },
  ]
  const maxAbs = Math.max(1, ...rows.map(row => Math.abs(row.mw)))
  return rows.map((row) => {
    const side = row.mw > 0 ? 'export' : row.mw < 0 ? 'import' : 'zero'
    return { id: row.id, label: row.label, mw: row.mw, side, length: Math.abs(row.mw) / maxAbs }
  })
}

/** Poll-health state shown instead of the CSD "Last update" stamp. */
export type PollStatus = 'loading' | 'live' | 'stale' | 'error'

/**
 * Map last-success / last-error into a feed-health label, not a CSD clock.
 * @param args.fetchedAt - last successful poll epoch ms, or null before one.
 * @param args.now - clock used for staleness.
 * @param args.error - last poll error message, or null on success.
 * @param args.loading - true until the first attempt settles.
 * @param args.staleAfterMs - age after which a success is stale (default 2× poll).
 * @returns the HUD poll-health discriminant.
 */
export function pollStatus(args: {
  readonly fetchedAt: number | null
  readonly now: number
  readonly error: string | null
  readonly loading: boolean
  readonly staleAfterMs?: number
}): PollStatus {
  if (args.loading && args.fetchedAt === null) return 'loading'
  if (args.fetchedAt === null) return args.error === null ? 'loading' : 'error'
  if (args.error !== null) return 'stale'
  const staleAfter = args.staleAfterMs ?? POLL_MS * 2
  if (args.now - args.fetchedAt > staleAfter) return 'stale'
  return 'live'
}

/**
 * Whether the URL asks for the 2D-only path (`?lite`).
 * @param search - `location.search`; defaults to the current window when present.
 * @returns true when the 3D orbit panel must stay unmounted.
 */
export function preferLiteScene(search?: string): boolean {
  const raw = search ?? (typeof window === 'undefined' ? '' : window.location.search)
  return new URLSearchParams(raw).has('lite')
}

/**
 * Format MW with a thousands separator; rounds to the nearest megawatt.
 * @param mw - megawatts.
 * @returns e.g. `10,354 MW`.
 */
export function formatMw(mw: number): string {
  return `${Math.round(mw).toLocaleString('en-CA')} MW`
}

/**
 * Format a share of AIL.
 * @param pct - percentage of load.
 * @returns e.g. `11.4% of AIL`.
 */
export function formatPctOfLoad(pct: number): string {
  return `${pct.toFixed(1)}% of AIL`
}

/**
 * Format pool price with a two-decimal dollar amount.
 * @param price - $/MWh.
 * @returns e.g. `$13.90/MWh`.
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}/MWh`
}

/**
 * Locale key for the orbit panel note.
 * @param on - whether the WebGL panel mounted.
 * @returns the orbit hint, or the 2D fallback copy.
 */
export function orbitNoteKey(on: boolean): 'hud.orbitHint' | 'hud.fallback' {
  return on ? 'hud.orbitHint' : 'hud.fallback'
}

/**
 * `data-orbit` value for the stage node.
 * @param on - whether the WebGL panel mounted.
 * @returns `on` or `off`.
 */
export function orbitMode(on: boolean): 'on' | 'off' {
  return on ? 'on' : 'off'
}

/**
 * Tooltip position relative to the Grid root, or the viewport when unrooted.
 * @param el - hovered row.
 * @param root - `[data-view=alberta-grid]` or null.
 * @returns x/y for the absolutely positioned tooltip.
 */
export function tooltipOffset(el: HTMLElement, root: Element | null): { x: number; y: number } {
  const rect = el.getBoundingClientRect()
  const parent = root?.getBoundingClientRect()
  return {
    x: rect.left - (parent?.left ?? 0) + rect.width / 2,
    y: rect.top - (parent?.top ?? 0),
  }
}
