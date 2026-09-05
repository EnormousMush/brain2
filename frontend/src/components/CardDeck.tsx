import { api } from '../api'
import type { Card } from '../types'

/** 三段式卡片：连接 / 点子 / 为什么是你 / 本周可做的一件事。
 *  「为什么是你」 is the product's soul — it is the only line a general-purpose
 *  LLM cannot write. Never collapse it. */
export default function CardDeck({
  cards, onReplay, onSaved,
}: {
  cards: Card[]
  onReplay: (chunkIds: string[]) => void
  onSaved?: (c: Card) => void
}) {
  if (!cards.length) return null
  return (
    <div className="deck">
      {cards.map(c => (
        <div key={c.id} className="card">
          <div className="card-conn">
            {c.connection.map((x, i) => (
              <span key={x.chunk_id}>
                {i > 0 && <em> × </em>}
                <span className="chip" title={x.quote}>{x.brain_name}</span>
              </span>
            ))}
            <button className="ghost"
                    onClick={() => onReplay(c.connection.map(x => x.chunk_id))}>
              在图上回放这条连接
            </button>
          </div>

          <div className="card-idea">{c.idea}</div>

          <div className="card-why"><b>为什么是你</b>{c.why_you}</div>
          <div className="card-next"><b>本周可做的一件事</b>{c.next_action}</div>

          <div className="card-scores">
            <Score label="惊喜" v={c.scores.surprise} />
            <Score label="可信" v={c.scores.credibility} />
            <Score label="可行" v={c.scores.feasibility} />
            <b>{c.scores.total.toFixed(2)}</b>
            <button className={c.saved ? 'primary' : 'ghost'}
                    onClick={() => api.saveCard(c.id, !c.saved).then(onSaved)}>
              {c.saved ? '已收藏' : '收藏'}
            </button>
          </div>

          <details className="card-src">
            <summary>原文出处（{c.connection.length}）</summary>
            {c.connection.map(x => (
              <blockquote key={x.chunk_id}>
                <b>{x.brain_name}</b> {x.source_path && <i>{x.source_path}</i>}
                <p>{x.quote}</p>
              </blockquote>
            ))}
          </details>
        </div>
      ))}
    </div>
  )
}

function Score({ label, v }: { label: string; v: number }) {
  return (
    <span className="score">
      {label}<i style={{ width: `${Math.round(v * 40)}px` }} />
    </span>
  )
}
