import { api } from '../api'
import type { Card } from '../types'

/** 结算卡片 as KPI panels: the idea is the headline, the two source fragments
 *  sit side by side with a × between them, 「为什么是你」 is a highlighted cell,
 *  and the score strip has one hero numeral with three label-over-value cells. */
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
        <span className="label">结算</span>
        <h3>想法卡片</h3>
        <span className="label num">{pad(cards.length)}</span>
      </div>
      {cards.map((c, ci) => {
        const [a, b] = c.connection
        return (
          <div key={c.id} className="panel card">
            <div className="panel-head">
              <span className="label">card {pad(ci + 1)}</span>
              {c.saved && <span className="tag ok">已收藏</span>}
            </div>
            <h2 className="card-idea">{c.idea}</h2>

            {a && b && (
              <div className="card-conn">
                <div className="conn-q">
                  <span className="label acc">{a.brain_name}</span>
                  <p>{a.quote}</p>
                  {a.source_path && <span className="label num">{a.source_path}</span>}
                </div>
                <div className="conn-x">×</div>
                <div className="conn-q">
                  <span className="label acc">{b.brain_name}</span>
                  <p>{b.quote}</p>
                  {b.source_path && <span className="label num">{b.source_path}</span>}
                </div>
              </div>
            )}
            {c.connection.length > 2 && (
              <div className="label">+ {c.connection.length - 2} more fragment(s)</div>
            )}

            <div className="why"><span className="label acc">为什么是你</span><span className="why-t">{c.why_you}</span></div>
            <div className="next"><span className="label">本周可做</span><span>{c.next_action}</span></div>

            <div className="scores">
              <div className="hero"><span className="kpi-v big">{c.scores.total.toFixed(2)}</span><span className="label">总分</span></div>
              <Score label="surprise" v={c.scores.surprise} />
              <Score label="credibility" v={c.scores.credibility} />
              <Score label="feasibility" v={c.scores.feasibility} />
              <div className="row-actions">
                <button className="pill ghost small" onClick={() => onReplay(c.connection.map(x => x.chunk_id))}>星图回放</button>
                <button className={`pill ${c.saved ? 'primary' : 'ghost'} small`}
                        onClick={() => api.saveCard(c.id, !c.saved).then(onSaved)}>
                  {c.saved ? '已收藏' : '收藏'}
                </button>
              </div>
            </div>

            <details className="card-src">
              <summary className="label">原文出处 · {pad(c.connection.length)}</summary>
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
    <div className="score">
      <span className="kpi-v">{v.toFixed(2)}</span>
      <span className="label">{label}</span>
      <i style={{ width: `${Math.round(v * 100)}%` }} />
    </div>
  )
}
