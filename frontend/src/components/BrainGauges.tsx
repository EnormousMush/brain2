import type { Brain } from '../types'

/** Right-edge panel: every brain as a ring gauge (its share of all fragments)
 *  with a live 命中 count when a spark has landed. Data carries the colour;
 *  the chrome stays gray. */
export default function BrainGauges({ brains, hits }: {
  brains: Brain[]
  hits: Record<string, number>
  onOpenSettings?: () => void
}) {
  const total = Math.max(1, brains.reduce((n, b) => n + (b.chunk_count || 0), 0))
  const hasHits = Object.keys(hits).length > 0
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="panel gauges">
      <div className="panel-head">
        <span className="label">副脑</span>
        <span className="label num">{pad(brains.length)}</span>
      </div>
      {brains.map((b, i) => {
        const share = (b.chunk_count || 0) / total
        const hit = hits[b.id] || 0
        const lit = !hasHits || hit > 0
        return (
          <div key={b.id} className={`gauge-row${lit ? '' : ' dim'}`}>
            <Ring share={share} density={i % 3} lit={lit} />
            <div className="gauge-text">
              <div className="gauge-name">{b.name}</div>
              <div className="gauge-meta">
                <span>{pad(b.chunk_count || 0)} 碎片</span>
                {hit > 0 && <span className="acc">{pad(hit)} 命中</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Ring({ share, density, lit }: { share: number; density: number; lit: boolean }) {
  const r = 15, c = 2 * Math.PI * r
  const alpha = [1, 0.7, 0.45][density]
  return (
    <svg className="ring" width="40" height="40" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r={r} className="ring-track" />
      <circle cx="20" cy="20" r={r} className="ring-arc"
              style={{ opacity: lit ? alpha : 0.25 }}
              strokeDasharray={`${c * Math.max(0.04, share)} ${c}`}
              transform="rotate(-90 20 20)" />
      <text x="20" y="21.5" textAnchor="middle" className="ring-val">{Math.round(share * 100)}</text>
    </svg>
  )
}
