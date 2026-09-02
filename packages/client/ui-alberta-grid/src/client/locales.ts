/** `alberta-grid` namespace dictionaries (view tab label + HUD strings). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'alberta-grid'

/** The alberta-grid dictionary key set. */
export type AlbertaGridKey =
  | 'view.grid'
  | 'hud.title'
  | 'hud.loading'
  | 'hud.error'
  | 'hud.ail'
  | 'hud.price'
  | 'hud.refresh'
  | 'hud.fallback'
  | 'hud.solarNote'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Alberta Grid view tab + HUD copy. */
    'alberta-grid': AlbertaGridKey
  }
}

/** Simplified Chinese dictionary. */
export const zh: Record<AlbertaGridKey, string> = {
  'view.grid': '电网',
  'hud.title': 'Alberta Grid',
  'hud.loading': '加载中…',
  'hud.error': '数据不可用',
  'hud.ail': 'AIL',
  'hud.price': '电价',
  'hud.refresh': '刷新',
  'hud.fallback': '2D 模式（WebGL 有限）',
  'hud.solarNote': 'Solar：AESO 可见（>5 MW）',
}

/** English dictionary. */
export const en: Record<AlbertaGridKey, string> = {
  'view.grid': 'Grid',
  'hud.title': 'Alberta Grid',
  'hud.loading': 'Loading…',
  'hud.error': 'Data unavailable',
  'hud.ail': 'AIL',
  'hud.price': 'Pool price',
  'hud.refresh': 'Refresh',
  'hud.fallback': '2D mode (modest WebGL)',
  'hud.solarNote': 'Solar: AESO-visible (>5 MW)',
}
