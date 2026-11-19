import React from 'react'

/** Cloth colours for generated covers — muted, bookbinder tones. */
const CLOTH = ['#2F4A35', '#6E2E26', '#26364A', '#5E4A1E', '#4A2F3F', '#34413F']

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function clothFor(title: string): string {
  return CLOTH[hash(title) % CLOTH.length]
}

/** Small laurel sprig ornament, drawn in the foil colour. */
function Sprig() {
  // Two mirrored laurel branches meeting at a centre dot.
  const leaves = [0, 1, 2]
  return (
    <svg width="54" height="16" viewBox="0 0 54 16" fill="none" aria-hidden>
      <circle cx="27" cy="8" r="1.4" fill="currentColor" />
      {[1, -1].map((dir) => (
        <g key={dir} transform={dir === -1 ? 'translate(54 0) scale(-1 1)' : undefined}>
          <path d="M24 8 Q14 8 4 6" stroke="currentColor" strokeWidth="0.8" fill="none" />
          {leaves.map((i) => {
            const x = 20 - i * 6
            return (
              <g key={i}>
                <ellipse cx={x} cy={5.2 - i * 0.3} rx="2.6" ry="1" transform={`rotate(-28 ${x} ${5.2 - i * 0.3})`} fill="currentColor" opacity="0.9" />
                <ellipse cx={x - 1} cy={9.6 - i * 0.6} rx="2.6" ry="1" transform={`rotate(22 ${x - 1} ${9.6 - i * 0.6})`} fill="currentColor" opacity="0.7" />
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}

interface BookCoverProps {
  title: string
  author?: string
  width?: number
  className?: string
}

/**
 * A cloth-bound book cover rendered in CSS: spine shading, blind-stamped
 * frame and foil title. Colour is derived from the title so it's stable.
 */
export function BookCover({ title, author, width = 200, className = '' }: BookCoverProps) {
  const cloth = clothFor(title)
  const height = Math.round(width * 1.06)
  const titleSize = Math.max(18, Math.min(38, (width * 1.9) / Math.max(title.length, 5)))

  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        width,
        height,
        borderRadius: '3px 6px 6px 3px',
        backgroundColor: cloth,
        backgroundImage: `
          linear-gradient(90deg, rgba(0,0,0,.38) 0, rgba(0,0,0,.12) 5%, rgba(255,255,255,.07) 7%, rgba(0,0,0,0) 10%),
          repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px),
          repeating-linear-gradient(-45deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)`,
        boxShadow:
          'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 -20px 40px rgba(0,0,0,.25), 0 10px 24px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.3)'
      }}
    >
      {/* blind-stamped frame */}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{
          inset: `${width * 0.08}px ${width * 0.08}px ${width * 0.08}px ${width * 0.13}px`,
          border: '1px solid rgba(217,183,122,.55)',
          outline: '1px solid rgba(217,183,122,.25)',
          outlineOffset: 3,
          color: '#D9B77A',
          padding: '0 8%'
        }}
      >
        <div
          className="font-serif leading-[1.05]"
          style={{ fontSize: titleSize, textShadow: '0 1px 0 rgba(0,0,0,.35)' }}
        >
          {title}
        </div>
        <div className="my-[8%] opacity-90">
          <Sprig />
        </div>
        {author && (
          <div className="font-serif italic opacity-90" style={{ fontSize: Math.max(11, width * 0.07) }}>
            {author}
          </div>
        )}
      </div>
    </div>
  )
}
