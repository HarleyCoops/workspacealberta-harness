import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import * as GridInvariant from '../src/invariant.ts'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(GridInvariant).await()).resolves.toBeDefined()
    expect(GridInvariant.name).toBe('client-ui-alberta-grid-invariant')
    expect(GridInvariant.inject).toEqual(['invariants'])
  })
})
