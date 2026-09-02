// workspaceAlberta brand wordmark: the monogram plus the product name in one
// svg. Native 182x24, matching the upstream artwork's box so every consumer's
// layout math is unchanged. Ink rides currentColor.
//
// The name is set as live text rather than traced letterforms so it stays
// legible at every size and needs no re-export when the wordmark changes.

import type { IconProps } from './icons/props.ts'

/** Display options for the brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading monogram; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the full brand wordmark.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading monogram.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 182 : 156
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 182 24' : '26 0 156 24'}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && (
        <>
          <rect width="24" height="24" rx="5" fill="#16324f" />
          <path
            d="M4.5 6.4l3.4 11.2 4.1-7.9 4.1 7.9 3.4-11.2"
            fill="none"
            stroke="#f2c14e"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      <text
        x="32"
        y="17"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="16"
        fontWeight="600"
        letterSpacing="-0.2"
        fill="currentColor"
      >
        workspaceAlberta
      </text>
    </svg>
  )
}
