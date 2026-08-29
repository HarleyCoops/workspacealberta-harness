import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

type OfficialBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/**
 * Render the official mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the WorkspaceAlberta monogram.
 */
export function OfficialBrandMark({ size, className }: OfficialBrandMarkProps) {
  return <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-label="WorkspaceAlberta">
    <rect width="64" height="64" rx="14" fill="#16324f" />
    <path d="M12 17l9 30 11-21 11 21 9-30" fill="none" stroke="#f2c14e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

/**
 * Render the WorkspaceAlberta name without its independently slotted mark.
 * @returns the WorkspaceAlberta product name.
 */
export function OfficialBrandName() {
  return <span>WorkspaceAlberta</span>
}
