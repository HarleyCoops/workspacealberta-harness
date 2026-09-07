import { describe, expect, it } from 'vitest'
import { Context } from '@workspacealberta/cordis'
import InvariantRegistry from '@workspacealberta/wa-invariants'
import * as UserIdInvariant from '@workspacealberta/wa-anonymous-user-id/invariant'

describe('invariant companion', () => {
  it('registers the package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(UserIdInvariant).await()).resolves.toBeDefined()
  })
})
