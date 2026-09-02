/** Three.js / 2D Alberta Grid scene controller. */

import * as THREE from 'three'
import {
  fuelTowers,
  priceBand,
  westIntertieMw,
  type GridSnapshot,
  type FuelTower,
} from './aeso.ts'

export interface HoverInfo {
  readonly id: string
  readonly label: string
  readonly mw: number
  readonly pctOfLoad: number | null
  readonly x: number
  readonly y: number
}

export interface SceneHandle {
  readonly mode: 'three' | 'canvas2d'
  setSnapshot(snapshot: GridSnapshot | null): void
  resize(): void
  dispose(): void
  onHover(cb: (info: HoverInfo | null) => void): void
}

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '') : ''
    // Prefer 2D on very weak / software adapters (common on Pi-like hosts).
    if (/llvmpipe|softpipe|swiftshader/i.test(renderer)) return false
    return true
  } catch {
    return false
  }
}

function priceColor(price: number | null): THREE.Color {
  if (price === null) return new THREE.Color('#3ee6e0')
  const band = priceBand(price)
  if (band === 'cool') return new THREE.Color('#3ee6e0')
  if (band === 'amber') return new THREE.Color('#f0b429')
  return new THREE.Color('#ff5d5d')
}

function scaleHeight(mw: number, maxMw: number, minH = 0.4, maxH = 5.5): number {
  if (maxMw <= 0) return minH
  return minH + (Math.max(0, mw) / maxMw) * (maxH - minH)
}

class ThreeScene implements SceneHandle {
  readonly mode = 'three' as const
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly root = new THREE.Group()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly pickables: THREE.Object3D[] = []
  private readonly meta = new WeakMap<THREE.Object3D, { id: string; label: string; mw: number }>()
  private ailMesh: THREE.Mesh | null = null
  private priceRing: THREE.Mesh | null = null
  private arc: THREE.Mesh | null = null
  private towers = new Map<string, THREE.Mesh>()
  private snapshot: GridSnapshot | null = null
  private raf = 0
  private hoverCb: ((info: HoverInfo | null) => void) | null = null
  private disposed = false
  private readonly host: HTMLElement

  constructor(host: HTMLElement) {
    this.host = host
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x050507, 1)
    host.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.display = 'block'

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.camera.position.set(0, 7.2, 14.5)
    this.camera.lookAt(0, 1.8, 0)
    this.scene.fog = new THREE.FogExp2(0x050507, 0.035)
    this.scene.add(new THREE.AmbientLight(0x6a7a88, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 1.05)
    key.position.set(6, 12, 4)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight(0x3ee6e0, 0.35)
    fill.position.set(-8, 4, -2)
    this.scene.add(fill)

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(10, 64),
      new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.92, metalness: 0.08 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    this.scene.add(ground)
    this.scene.add(this.root)

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave)
    this.resize()
    this.loop()
  }

  onHover(cb: (info: HoverInfo | null) => void): void {
    this.hoverCb = cb
  }

  setSnapshot(snapshot: GridSnapshot | null): void {
    this.snapshot = snapshot
    this.rebuild()
  }

  resize(): void {
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private readonly onPointerLeave = (): void => {
    this.hoverCb?.(null)
  }

  private readonly onPointerMove = (ev: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.pickables, false)
    if (hits.length === 0) {
      this.hoverCb?.(null)
      return
    }
    const obj = hits[0]!.object
    const m = this.meta.get(obj)
    if (!m) {
      this.hoverCb?.(null)
      return
    }
    const ail = this.snapshot?.csd.ail ?? 0
    this.hoverCb?.({
      id: m.id,
      label: m.label,
      mw: m.mw,
      pctOfLoad: ail > 0 ? (m.mw / ail) * 100 : null,
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    })
  }

  private clearRoot(): void {
    while (this.root.children.length > 0) {
      const child = this.root.children[0]!
      this.root.remove(child)
      child.traverse((o) => {
        const mesh = o as THREE.Mesh
        mesh.geometry?.dispose?.()
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else mat?.dispose?.()
      })
    }
    this.pickables.length = 0
    this.towers.clear()
    this.ailMesh = null
    this.priceRing = null
    this.arc = null
  }

  private rebuild(): void {
    this.clearRoot()
    const snap = this.snapshot
    if (!snap) return
    const ail = Math.max(0, snap.csd.ail)
    const towers = fuelTowers(snap.csd.fuels)
    const maxTower = Math.max(1, ...towers.map(t => t.tng), ail * 0.35)
    const price = snap.price?.price ?? null
    const pColor = priceColor(price)

    // Centre AIL glowing volume
    const ailH = scaleHeight(ail, Math.max(ail, 12000), 1.2, 4.2)
    const ailGeom = new THREE.SphereGeometry(1.15, 48, 32)
    ailGeom.scale(1, ailH / 2.2, 1)
    const ailMat = new THREE.MeshStandardMaterial({
      color: pColor,
      emissive: pColor,
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92,
    })
    this.ailMesh = new THREE.Mesh(ailGeom, ailMat)
    this.ailMesh.position.set(0, ailH / 2, 0)
    this.root.add(this.ailMesh)
    this.pickables.push(this.ailMesh)
    this.meta.set(this.ailMesh, { id: 'ail', label: 'Alberta Internal Load (AIL)', mw: ail })

    // Price pulse ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.06, 12, 64),
      new THREE.MeshStandardMaterial({
        color: pColor,
        emissive: pColor,
        emissiveIntensity: 0.8,
        roughness: 0.4,
        metalness: 0.2,
      }),
    )
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.08
    this.priceRing = ring
    this.root.add(ring)

    // Fuel towers in an arc
    const radius = 5.2
    towers.forEach((tower, i) => {
      const a = -Math.PI * 0.55 + (i / Math.max(1, towers.length - 1)) * Math.PI * 1.1
      const h = scaleHeight(tower.tng, maxTower)
      const color = towerColor(tower.id)
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, h, 0.85),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.28,
          roughness: 0.45,
          metalness: 0.2,
        }),
      )
      mesh.position.set(Math.cos(a) * radius, h / 2, Math.sin(a) * radius)
      this.root.add(mesh)
      this.towers.set(tower.id, mesh)
      this.pickables.push(mesh)
      const label = tower.id === 'solar' ? `${tower.label} (AESO-visible >5 MW)` : tower.label
      this.meta.set(mesh, { id: tower.id, label, mw: tower.tng })
    })

    // Intertie arc BC+Montana
    const west = westIntertieMw(snap.csd.interties)
    const exporting = west >= 0
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(exporting ? 1.4 : -6.5, 1.2, 0),
      new THREE.Vector3(0, 3.8 + Math.min(2.5, Math.abs(west) / 400), exporting ? -2.2 : 2.2),
      new THREE.Vector3(exporting ? -6.5 : 1.4, 1.2, 0),
    )
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.07, 8, false),
      new THREE.MeshStandardMaterial({
        color: exporting ? 0x5b8cff : 0xff9f43,
        emissive: exporting ? 0x5b8cff : 0xff9f43,
        emissiveIntensity: 0.65,
        roughness: 0.35,
        metalness: 0.25,
      }),
    )
    this.arc = tube
    this.root.add(tube)
    this.pickables.push(tube)
    this.meta.set(tube, {
      id: 'intertie',
      label: exporting ? 'Intertie export (BC+Montana)' : 'Intertie import (BC+Montana)',
      mw: Math.abs(west),
    })
  }

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const t = performance.now() * 0.001
    if (this.ailMesh) {
      this.ailMesh.rotation.y = t * 0.25
      const s = 1 + Math.sin(t * 2.1) * 0.03
      this.ailMesh.scale.set(s, s, s)
    }
    if (this.priceRing) {
      const pulse = 1 + Math.sin(t * 3.2) * 0.08
      this.priceRing.scale.set(pulse, pulse, pulse)
      this.priceRing.rotation.z = t * 0.4
    }
    if (this.arc) this.arc.rotation.y = Math.sin(t * 0.7) * 0.04
    this.root.rotation.y = Math.sin(t * 0.15) * 0.08
    this.renderer.render(this.scene, this.camera)
  }
}

function towerColor(id: string): THREE.Color {
  switch (id) {
    case 'solar': return new THREE.Color('#f5d76e')
    case 'wind': return new THREE.Color('#7ad3ff')
    case 'gas': return new THREE.Color('#ff7a59')
    case 'hydro': return new THREE.Color('#4ad6a3')
    case 'storage': return new THREE.Color('#c792ff')
    default: return new THREE.Color('#9aa4b2')
  }
}

class Canvas2DScene implements SceneHandle {
  readonly mode = 'canvas2d' as const
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private snapshot: GridSnapshot | null = null
  private raf = 0
  private disposed = false
  private hoverCb: ((info: HoverInfo | null) => void) | null = null
  private hitRegions: Array<HoverInfo & { x0: number; y0: number; x1: number; y1: number }> = []
  private readonly host: HTMLElement

  constructor(host: HTMLElement) {
    this.host = host
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'
    host.appendChild(this.canvas)
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
    this.canvas.addEventListener('pointermove', this.onPointerMove)
    this.canvas.addEventListener('pointerleave', () => this.hoverCb?.(null))
    this.resize()
    this.loop()
  }

  onHover(cb: (info: HoverInfo | null) => void): void {
    this.hoverCb = cb
  }

  setSnapshot(snapshot: GridSnapshot | null): void {
    this.snapshot = snapshot
  }

  resize(): void {
    const w = Math.max(1, this.host.clientWidth)
    const h = Math.max(1, this.host.clientHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.canvas.remove()
  }

  private readonly onPointerMove = (ev: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    const hit = this.hitRegions.find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)
    this.hoverCb?.(hit
      ? { id: hit.id, label: hit.label, mw: hit.mw, pctOfLoad: hit.pctOfLoad, x, y }
      : null)
  }

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    this.draw(performance.now() * 0.001)
  }

  private draw(t: number): void {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    const ctx = this.ctx
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#050507'
    ctx.fillRect(0, 0, w, h)
    this.hitRegions = []
    const snap = this.snapshot
    if (!snap) return
    const ail = snap.csd.ail
    const price = snap.price?.price ?? null
    const band = price === null ? 'cool' : priceBand(price)
    const color = band === 'cool' ? '#3ee6e0' : band === 'amber' ? '#f0b429' : '#ff5d5d'
    const cx = w * 0.5
    const cy = h * 0.55
    const pulse = 1 + Math.sin(t * 3) * 0.04
    const r = Math.min(w, h) * 0.12 * pulse
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.85
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2)
    ctx.stroke()
    this.hitRegions.push({
      id: 'ail', label: 'Alberta Internal Load (AIL)', mw: ail,
      pctOfLoad: 100, x: cx, y: cy, x0: cx - r * 1.55, y0: cy - r * 1.55, x1: cx + r * 1.55, y1: cy + r * 1.55,
    })

    const towers = fuelTowers(snap.csd.fuels)
    const maxT = Math.max(1, ...towers.map(x => x.tng))
    const baseY = h * 0.82
    const startX = w * 0.12
    const gap = (w * 0.76) / Math.max(1, towers.length)
    towers.forEach((tower, i) => {
      const bh = (tower.tng / maxT) * h * 0.35 + 12
      const x = startX + i * gap
      const y = baseY - bh
      ctx.fillStyle = tower.id === 'solar' ? '#f5d76e'
        : tower.id === 'wind' ? '#7ad3ff'
          : tower.id === 'gas' ? '#ff7a59'
            : tower.id === 'hydro' ? '#4ad6a3' : '#c792ff'
      ctx.fillRect(x, y, gap * 0.55, bh)
      ctx.fillStyle = '#cfd8e3'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.fillText(tower.label, x, baseY + 14)
      this.hitRegions.push({
        id: tower.id,
        label: tower.id === 'solar' ? 'Solar (AESO-visible >5 MW)' : tower.label,
        mw: tower.tng,
        pctOfLoad: ail > 0 ? (tower.tng / ail) * 100 : null,
        x: x + gap * 0.25,
        y,
        x0: x, y0: y, x1: x + gap * 0.55, y1: baseY,
      })
    })

    const west = westIntertieMw(snap.csd.interties)
    ctx.strokeStyle = west >= 0 ? '#5b8cff' : '#ff9f43'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx + r, cy - 10)
    ctx.quadraticCurveTo(cx, cy - h * 0.28, w * 0.08, h * 0.28)
    ctx.stroke()
  }
}

export function createGridScene(host: HTMLElement): SceneHandle {
  if (canUseWebGL()) {
    try {
      return new ThreeScene(host)
    } catch {
      // fall through
    }
  }
  return new Canvas2DScene(host)
}

// silence unused type import in some bundlers
void (0 as unknown as FuelTower)
