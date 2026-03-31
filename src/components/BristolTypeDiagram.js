/**
 * Simplified schematic SVGs for Bristol chart types 1–7 (original shapes for UI only;
 * not reproductions of any specific published clinical figure).
 */
export default function BristolTypeDiagram({ type, className = '' }) {
  const n = Number(type)
  const svgClass = `block flex-shrink-0 text-[#6b4a2c] dark:text-[#c9a77a] ${className}`.trim()
  const f = 'currentColor'

  switch (n) {
    case 1:
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <circle cx="14" cy="26" r="4.2" />
          <circle cx="26" cy="22" r="4.2" />
          <circle cx="40" cy="26" r="4.2" />
          <circle cx="30" cy="13" r="3.5" />
        </svg>
      )
    case 2:
      /* Lumpy sausage: overlapping knobs in one horizontal band (reads as one lumpy log, not loose blobs) */
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <circle cx="14" cy="23" r="5.8" />
          <circle cx="23" cy="20" r="6.3" />
          <circle cx="33" cy="20" r="6.3" />
          <circle cx="42" cy="23" r="5.8" />
        </svg>
      )
    case 3:
      /* Cracked sausage: same capsule as type 4, with branching surface cracks */
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <rect x="10" y="16" width="36" height="12" rx="6" ry="6" />
          <path
            fill="none"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[#fffaf5] dark:stroke-[#140c08]"
            d="M17.5 17.5l-1.4 4 2 3.8-1.6 3.5M23 17.2l1.2 4.5-1.8 3.6M28 17.2l.6 3.4-1.4 4.2 1.6 2.6M33.2 17.3l-1.1 4.8 2.2 3-1 3.3M38.8 17.2l1.6 3.8-2.2 3.8 1.4 3"
          />
        </svg>
      )
    case 4:
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <rect x="10" y="16" width="36" height="12" rx="6" ry="6" />
        </svg>
      )
    case 5:
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <ellipse cx="18" cy="22" rx="9" ry="7" opacity="0.95" />
          <ellipse cx="30" cy="20" rx="10" ry="8" opacity="0.9" />
          <ellipse cx="42" cy="23" rx="8" ry="6.5" opacity="0.95" />
        </svg>
      )
    case 6:
      /* Mushy / fluffy: one soft irregular mass, wavy edge — not separate blobs or pebbles */
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <path
            d="M12 25.5 C12 20.5 15.5 16.5 20 17 C22 13 27.5 12.5 31 15.5 C34 12.5 39.5 13.5 43 17 C47 16 49.5 21 48.5 25.5 C47.5 30 42.5 31.5 38 30 C34 31.5 28.5 30.5 24.5 28.5 C21 30.5 16 30 13.5 27.5 C11.5 27 11.5 26 12 25.5 Z"
            opacity="0.92"
          />
        </svg>
      )
    case 7:
      return (
        <svg className={svgClass} viewBox="0 0 56 40" fill={f} aria-hidden>
          <path
            d="M8 28c6-3 12 2 18 0s12-2 18 0 8 2 12-1v8H8v-7z"
            opacity="0.85"
          />
          <path
            d="M8 26c5-2 10 1 15-1s11-2 16 0 10 1 17-2"
            fill="none"
            stroke={f}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      )
    default:
      return null
  }
}
