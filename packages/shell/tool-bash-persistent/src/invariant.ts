/**
 * Package-owned invariant companion for `@workspacealberta/wa-tool-bash-persistent`.
 * @module @workspacealberta/wa-tool-bash-persistent/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@workspacealberta/cordis'
import type { InvariantInstaller } from '@workspacealberta/wa-invariants'

const PACKAGE_NAME = '@workspacealberta/wa-tool-bash-persistent'

/** Cordis companion plugin name. */
export const name = 'tool-bash-persistent-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the adapter's private owner-to-shell cache has no
 * observable event or data relation. Lifecycle tests prove its cleanup without
 * adding a public API solely for an invariant.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
