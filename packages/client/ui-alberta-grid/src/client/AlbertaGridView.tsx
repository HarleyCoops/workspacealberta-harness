/** Alberta Grid conversation view: live AESO Three.js / 2D viz. */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { fetchGrid, priceBand, type GridSnapshot } from './aeso.ts'
import { createGridScene, type HoverInfo, type SceneHandle } from './scene.ts'
import type { AlbertaGridKey } from './locales.ts'
import css from './AlbertaGridView.module.css'

const POLL_MS = 90_000

export type AlbertaGridViewProps = ConvViewProps & PropsLocale<AlbertaGridKey>

function formatMw(mw: number): string {
  return `${Math.round(mw).toLocaleString('en-CA')} MW`
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

/**
 * Full-height Grid tab: polls Railway CSD/price, drives Three.js (or 2D fallback).
 */
export function AlbertaGridView(props: AlbertaGridViewProps): JSX.Element {
  const { t } = props
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneHandle | null>(null)
  const [snapshot, setSnapshot] = useState<GridSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [mode, setMode] = useState<'three' | 'canvas2d'>('three')

  const load = useCallback(async () => {
    try {
      const next = await fetchGrid()
      setSnapshot(next)
      setError(null)
      sceneRef.current?.setSnapshot(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const host = stageRef.current
    if (!host) return
    const scene = createGridScene(host)
    sceneRef.current = scene
    setMode(scene.mode)
    scene.onHover(setHover)
    if (snapshot) scene.setSnapshot(snapshot)
    const onResize = (): void => scene.resize()
    const ro = new ResizeObserver(onResize)
    ro.observe(host)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      scene.dispose()
      sceneRef.current = null
    }
    // Mount once per host lifetime; snapshot updates flow through setSnapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => { void load() }, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    sceneRef.current?.setSnapshot(snapshot)
  }, [snapshot])

  const price = snapshot?.price?.price ?? null
  const band = price === null ? null : priceBand(price)
  const bandClass = band === 'cool' ? css.cool : band === 'amber' ? css.amber : band === 'hot' ? css.hot : undefined

  return (
    <div className={css.root} data-view="alberta-grid">
      <div className={css.stage} ref={stageRef} />
      <div className={css.hud}>
        <div className={css.topRow}>
          <div className={css.card}>
            <h2 className={css.title}>{t('hud.title')}</h2>
            <p className={css.meta}>
              {snapshot?.csd.lastUpdate
                ? `Last update: ${snapshot.csd.lastUpdate}`
                : loading ? t('hud.loading') : '—'}
            </p>
            {error !== null && <p className={`${css.meta} ${css.error}`}>{t('hud.error')}: {error}</p>}
            <div className={css.metrics}>
              <div className={css.metric}>
                <label>{t('hud.ail')}</label>
                <strong>{snapshot ? formatMw(snapshot.csd.ail) : '—'}</strong>
              </div>
              <div className={css.metric}>
                <label>{t('hud.price')}</label>
                <strong className={bandClass}>
                  {price === null ? '—' : formatPrice(price)}
                </strong>
              </div>
            </div>
            <span className={css.badge}>{t('hud.solarNote')}</span>
            {mode === 'canvas2d' && <span className={css.badge}>{t('hud.fallback')}</span>}
          </div>
          <div className={css.actions}>
            <button type="button" className={css.button} onClick={() => { void load() }}>
              {t('hud.refresh')}
            </button>
          </div>
        </div>
        <div className={css.bottomRow}>
          <div className={css.card}>
            <p className={css.meta}>
              Gen {snapshot ? formatMw(snapshot.csd.totalNetGeneration) : '—'}
              {' · '}
              Interchange {snapshot ? formatMw(snapshot.csd.netActualInterchange) : '—'}
              {snapshot?.price?.dateHe ? ` · HE ${snapshot.price.dateHe}` : ''}
            </p>
          </div>
        </div>
      </div>
      {hover !== null && (
        <div className={css.tooltip} style={{ left: hover.x, top: hover.y }}>
          <div><strong>{hover.label}</strong></div>
          <div>{formatMw(hover.mw)}</div>
          {hover.pctOfLoad !== null && (
            <div>{hover.pctOfLoad.toFixed(1)}% of AIL</div>
          )}
        </div>
      )}
    </div>
  )
}
