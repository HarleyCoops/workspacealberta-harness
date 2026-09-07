/**
 * Package-owned invariant companion for `@workspacealberta/wa-api-gateway`.
 * @module @workspacealberta/wa-api-gateway/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@workspacealberta/cordis'
import type { InvariantInstaller } from '@workspacealberta/wa-invariants'

const PACKAGE_NAME = '@workspacealberta/wa-api-gateway'

/** Cordis companion plugin name. */
export const name = 'api-gateway-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: Host calls re-read authoritative Cordis and Typert
 * state, while Client methods, descriptors, and `$on` subscriptions mutate in
 * one owned effect.
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
