import { api } from '../api'
import type { Card } from '../types'

/** 结算卡片 as a printed plate: the idea is the headline, the two source
 *  fragments sit side by side with a × between them, and 「为什么是你」 is set
 *  on a screened field so it can never be missed. Never collapse it. */
export default function CardDeck({
  cards, onReplay, onSaved,
}: {
  cards: Card[]
  onReplay: (chunkIds: string[]) => void
  onSaved?: (c: Card) => void
}) {
  if (!cards.length) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="deck">
      <div className="deck-head">
        <span className="mono">02 · 结算</span>
        <h3>想法卡片</h3>
        <span className="mono">{pad(cards.length)}</span>
      </div>
      {cards.map((c, ci) => {
        const [a, b] = c.connection
        return (
          <div key={c.id} className="card">
            <span className="mono">card {pad(ci + 1)}</span>
            <h2 className="card-idea">{c.idea}</h2>

            {a && b && (
              <div className="card-conn">
                <div className="conn-q">
                  <span className="mono">{a.brain_name}</span>
                  <p>{a.quote}</p>
                  {a.source_path && <span className="src">{a.source_path}</span>}
                </div>
                <div className="conn-x">×</div>
                <div className="conn-q">
                  <span className="mono">{b.brain_name}</span>
                  <p>{b.quote}</p>
                  {b.source_path && <span className="src">{b.source_path}</span>}
                </div>
              </div>
            )}
            {c.connection.length > 2 && (
              <div className="conn-more">+ {c.connection.length - 2} more fragment(s)</div>
            )}

            <div className="card-why"><b>为什么是你</b><span>{c.why_you}</span></div>
            <div className="card-next"><b>本周可做</b><span>{c.next_action}</span></div>

            <div className="card-scores">
              <Score label="surprise" v={c.scores.surprise} />
              <Score label="credibility" v={c.scores.credibility} />
              <Score label="feasibility" v={c.scores.feasibility} />
              <span className="card-total">{c.scores.total.toFixed(2)}</span>
              <div className="card-actions">
                <button className="ghost mono" onClick={() => onReplay(c.connection.map(x => x.chunk_id))}>
                  星图回放
                </button>
                <button className={`${c.saved ? 'primary' : 'ghost'} mono`}
                        onClick={() => api.saveCard(c.id, !c.saved).then(onSaved)}>
                  {c.saved ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>

            <details className="card-src">
              <summary>原文出处 · {pad(c.connection.length)}</summary>
              {c.connection.map(x => (
                <blockquote key={x.chunk_id}>
                  <b>{x.brain_name}</b>{x.source_path && <i>{x.source_path}</i>}
                  <p>{x.quote}</p>
                </blockquote>
              ))}
            </details>
          </div>
        )
      })}
    </div>
  )
}

function Score({ label, v }: { label: string; v: number }) {
  return (
    <span className="score">
      <span>{label} <em>{v.toFixed(2)}</em></span>
      <i style={{ width: `${Math.round(v * 100)}%` }} />
    </span>
  )
}
