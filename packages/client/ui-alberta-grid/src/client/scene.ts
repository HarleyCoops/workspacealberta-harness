/**
 * Optional orbitable 3D metaphor. Critical comparisons live on the 2D bars;
 * this panel reuses the same qualitative fuel colors and never encodes pool
 * price as bloom intensity.
 */

import * as THREE from 'three'
import { fuelTowers, westIntertieMw, type GridSnapshot } from './aeso.ts'
import { FUEL_COLORS, preferLiteScene, priceColor, type FuelId } from './encodings.ts'

/** Hover payload shared with the 2D tooltip. */
export interface HoverInfo {
  readonly id: string
  readonly label: string
  readonly mw: number
  readonly pctOfLoad: number | null
  readonly x: number
  readonly y: number
}

/** Controller for the optional WebGL panel. */
export interface SceneHandle {
  readonly mode: 'three'
  setSnapshot(snapshot: GridSnapshot | null): void
  resize(): void
  dispose(): void
  onHover(cb: (info: HoverInfo | null) => void): void
}

/** Options that decide whether the orbit panel may mount. */
export interface SceneOptions {
  readonly lite?: boolean
  readonly webgl?: boolean
}

/**
 * Probe a WebGL context. Software adapters count as a miss so the 2D bars
 * remain the only encoding on Pi-class hosts.
 * @returns true when a hardware WebGL context is available.
 */
export function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (!dbg) return true
    const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? '')
    if (/llvmpipe|softpipe|swiftshader/i.test(renderer)) return false
    return true
  } catch {
    return false
  }
}

/**
 * Whether the optional 3D panel should mount.
 * @param options - explicit lite/webgl overrides, else URL + probe.
 * @returns false for `?lite` or a failed WebGL probe.
 */
export function shouldMountThree(options: SceneOptions = {}): boolean {
  const lite = options.lite ?? preferLiteScene()
  const webgl = options.webgl ?? canUseWebGL()
  return !lite && webgl
}

/* v8 ignore start -- WebGLRenderer and the orbit loop require a GPU context the jsdom coverage lane cannot construct. */
function disposeObject3D(obj: THREE.Object3D): void {
  const mesh = obj as THREE.Mesh
  const geometry = mesh.geometry as THREE.BufferGeometry | undefined
  if (geometry !== undefined) geometry.dispose()
  const material = mesh.material as THREE.Material | THREE.Material[] | undefined
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose()
    }
    return
  }
  if (material !== undefined) material.dispose()
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
  private snapshot: GridSnapshot | null = null
  private raf = 0
  private hoverCb: ((info: HoverInfo | null) => void) | null = null
  private disposed = false
  private readonly host: HTMLElement
  private yaw = 0.55
  private pitch = 0.42
  private radius = 16
  private dragging = false
  private lastX = 0
  private lastY = 0

  constructor(host: HTMLElement) {
    this.host = host
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x1a1c1f, 1)
    host.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.touchAction = 'none'

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    this.scene.fog = new THREE.FogExp2(0x1a1c1f, 0.028)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(6, 12, 4)
    this.scene.add(key)
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(11, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.95, metalness: 0.04 }),
    )
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)
    this.scene.add(this.root)
    this.bindPointer()
    this.aimCamera()
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
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerup', this.onPointerUp)
    el.removeEventListener('pointerleave', this.onPointerLeave)
    el.removeEventListener('wheel', this.onWheel)
    this.renderer.dispose()
    el.remove()
  }

  private bindPointer(): void {
    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointerleave', this.onPointerLeave)
    el.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private readonly onPointerDown = (ev: PointerEvent): void => {
    this.dragging = true
    this.lastX = ev.clientX
    this.lastY = ev.clientY
    this.renderer.domElement.setPointerCapture(ev.pointerId)
  }

  private readonly onPointerUp = (ev: PointerEvent): void => {
    this.dragging = false
    this.renderer.domElement.releasePointerCapture(ev.pointerId)
  }

  private readonly onPointerLeave = (): void => {
    this.dragging = false
    this.hoverCb?.(null)
  }

  private readonly onWheel = (ev: WheelEvent): void => {
    ev.preventDefault()
    this.radius = Math.min(28, Math.max(8, this.radius + ev.deltaY * 0.01))
    this.aimCamera()
  }

  private readonly onPointerMove = (ev: PointerEvent): void => {
    if (this.dragging) {
      const dx = ev.clientX - this.lastX
      const dy = ev.clientY - this.lastY
      this.lastX = ev.clientX
      this.lastY = ev.clientY
      this.yaw -= dx * 0.008
      this.pitch = Math.min(1.15, Math.max(0.12, this.pitch + dy * 0.006))
      this.aimCamera()
      return
    }
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(this.pickables, false)
    const first = hits[0]
    if (first === undefined) {
      this.hoverCb?.(null)
      return
    }
    const obj = first.object
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

  private aimCamera(): void {
    this.camera.position.set(
      this.radius * Math.sin(this.yaw) * Math.cos(this.pitch),
      this.radius * Math.sin(this.pitch),
      this.radius * Math.cos(this.yaw) * Math.cos(this.pitch),
    )
    this.camera.lookAt(0, 1.1, 0)
  }

  private clearRoot(): void {
    while (this.root.children.length > 0) {
      const child = this.root.children[0]
      if (child === undefined) break
      this.root.remove(child)
      child.traverse((o) => {
        disposeObject3D(o)
      })
    }
    this.pickables.length = 0
  }

  private rebuild(): void {
    this.clearRoot()
    const snap = this.snapshot
    if (!snap) return
    const ail = Math.max(0, snap.csd.ail)
    const towers = fuelTowers(snap.csd.fuels)
    const maxTower = Math.max(1, ...towers.map(t => t.tng))
    const price = snap.price?.price ?? null
    const pCss = price === null ? '#56B4E9' : priceColor(price)
    const pColor = new THREE.Color(pCss)

    // Fixed-size load vessel: decorative only. AIL is read from the 2D number.
    const vessel = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 40, 28),
      new THREE.MeshStandardMaterial({
        color: pColor,
        roughness: 0.45,
        metalness: 0.12,
        transparent: true,
        opacity: 0.35,
        emissive: pColor,
        emissiveIntensity: 0.08,
      }),
    )
    vessel.position.set(0, 1.15, 0)
    this.root.add(vessel)
    this.pickables.push(vessel)
    this.meta.set(vessel, { id: 'ail', label: 'Alberta Internal Load (AIL)', mw: ail })

    const radius = 5.4
    towers.forEach((tower, i) => {
      const a = -Math.PI * 0.55 + (i / Math.max(1, towers.length - 1)) * Math.PI * 1.1
      const h = Math.max(0.04, (Math.max(0, tower.tng) / maxTower) * 4.8)
      const color = new THREE.Color(FUEL_COLORS[tower.id as FuelId])
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, h, 0.8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 }),
      )
      mesh.position.set(Math.cos(a) * radius, h / 2, Math.sin(a) * radius)
      this.root.add(mesh)
      this.pickables.push(mesh)
      const label = tower.id === 'solar' ? `${tower.label} (AESO-visible >5 MW)` : tower.label
      this.meta.set(mesh, { id: tower.id, label, mw: tower.tng })
    })

    // Ground-plane signed arrows (BC+Montana net), not foreshortened ribbons.
    const west = westIntertieMw(snap.csd.interties)
    const dir = west >= 0 ? -1 : 1
    const len = 1.2 + Math.min(4.5, Math.abs(west) / 80)
    const arrow = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.08, 0.28),
      new THREE.MeshStandardMaterial({
        color: west >= 0 ? 0x0072B2 : 0xD55E00,
        roughness: 0.4,
        metalness: 0.1,
      }),
    )
    arrow.position.set(dir * (2.4 + len / 2), 0.08, 0)
    this.root.add(arrow)
    this.pickables.push(arrow)
    this.meta.set(arrow, {
      id: 'intertie',
      label: west >= 0 ? 'Intertie export (BC+Montana)' : 'Intertie import (BC+Montana)',
      mw: Math.abs(west),
    })
  }

  private loop = (): void => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    this.renderer.render(this.scene, this.camera)
  }
}
/* v8 ignore stop */

/**
 * Mount the orbit panel when WebGL is usable and `?lite` is absent.
 * @param host - element that receives the canvas.
 * @param options - lite / webgl overrides (tests pass these explicitly).
 * @returns a handle, or null so the same 2D bars remain the only encoding.
 */
export function createGridScene(host: HTMLElement, options: SceneOptions = {}): SceneHandle | null {
  /* v8 ignore next 6 -- WebGLRenderer cannot construct in the jsdom coverage lane. */
  if (shouldMountThree(options)) {
    try {
      return new ThreeScene(host)
    } catch {
      return null
    }
  }
  return null
}
