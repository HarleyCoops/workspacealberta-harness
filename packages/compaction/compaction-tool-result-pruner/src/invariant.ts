/**
 * Package-owned invariant companion for `@workspacealberta/wa-compaction-tool-result-pruner`.
 * @module @workspacealberta/wa-compaction-tool-result-pruner/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@workspacealberta/cordis'
import type { InvariantInstaller } from '@workspacealberta/wa-invariants'

const PACKAGE_NAME = '@workspacealberta/wa-compaction-tool-result-pruner'

/** Cordis companion plugin name. */
export const name = 'compaction-tool-result-pruner-invariant'
/** Services required before the companion can register. */
export const inject = ['invariants']

/** No runtime invariant: Session validates each content-only rewrite and its companion owns cross-event enclosure. */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
