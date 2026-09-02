// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canUseWebGL, createGridScene, shouldMountThree } from '../src/client/scene.ts'

const canvasProto = HTMLCanvasElement.prototype
const getContextDescriptor = Object.getOwnPropertyDescriptor(canvasProto, 'getContext')

afterEach(() => {
  if (getContextDescriptor !== undefined) {
    Object.defineProperty(canvasProto, 'getContext', getContextDescriptor)
  }
})

function stubGetContext(impl: (type: string) => object | null): void {
  canvasProto.getContext = ((type: string) => impl(type)) as typeof canvasProto.getContext
}

describe('canUseWebGL', () => {
  it('returns false when no context exists', () => {
    stubGetContext(() => null)
    expect(canUseWebGL()).toBe(false)
  })

  it('returns true when WebGL exists without a debug renderer string', () => {
    stubGetContext((type) => {
      if (type === 'webgl2') return null
      return { getExtension: () => null, getParameter: () => '' }
    })
    expect(canUseWebGL()).toBe(true)
  })

  it('returns false on software adapters and true on a hardware string', () => {
    stubGetContext(() => ({
      getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
      getParameter: () => 'Google SwiftShader',
    }))
    expect(canUseWebGL()).toBe(false)

    stubGetContext(() => ({
      getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
      getParameter: () => 'ANGLE (NVIDIA)',
    }))
    expect(canUseWebGL()).toBe(true)

    stubGetContext(() => ({
      getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 0x9246 }),
      getParameter: () => undefined,
    }))
    expect(canUseWebGL()).toBe(true)
  })

  it('returns false when context construction throws', () => {
    canvasProto.getContext = (() => {
      throw new Error('no gl')
    }) as typeof canvasProto.getContext
    expect(canUseWebGL()).toBe(false)
  })
})

describe('shouldMountThree / createGridScene', () => {
  it('stays off for ?lite or a failed WebGL probe', () => {
    expect(shouldMountThree({ lite: true, webgl: true })).toBe(false)
    expect(shouldMountThree({ lite: false, webgl: false })).toBe(false)
    expect(shouldMountThree({ lite: false, webgl: true })).toBe(true)
    const host = document.createElement('div')
    expect(createGridScene(host, { lite: true, webgl: true })).toBeNull()
    expect(createGridScene(host, { lite: false, webgl: false })).toBeNull()
  })

  it('uses the live probe when overrides are omitted', () => {
    stubGetContext(() => null)
    vi.spyOn(window, 'location', 'get').mockReturnValue({ search: '' } as Location)
    expect(shouldMountThree()).toBe(false)
  })
})
