import { useEffect, useRef, useState } from 'react'
import { streamDebate } from '../api'
import { ROLE_CN, STANCE_CN } from '../types'
import type { Card, Role, Turn } from '../types'

/**
 * 副脑辩论剧场. The debate IS the demo, so it must arrive one turn at a time —
 * a spinner followed by a wall of text kills the room. Everything below renders
 * off the SSE stream from /api/debates/{id}/stream.
 *
 * Printed-transcript layout: a narrow left column carries index, role and the
 * brain it speaks for; the right column carries the words. Rejected turns stay
 * in the record, struck through, with the referee's reason in mono.
 */
const ROLE_EN: Record<Role, string> = {
  moderator: 'MOD', proposer: 'PROPOSER', analogist: 'ANALOGIST',
  skeptic: 'SKEPTIC', pragmatist: 'PRAGMATIST',
}
const STANCE_GLYPH: Record<string, string> = { support: '+', attack: '−', reframe: '~', summary: '=' }

type Entry =
  | { kind: 'turn'; t: Turn }
  | { kind: 'reject'; role: string; reason: string; round: number; seq: number }

export default function DebateTheater({
  debateId, onCards, onCite, onActive,
}: {
  debateId: string | null
  onCards: (c: Card[]) => void
  onCite: (chunkIds: string[]) => void      // explicit: take me to the galaxy
  onActive: (chunkIds: string[]) => void    // silent: remember what's lit
}) {
  const [motion, setMotion] = useState('')
  const [roles, setRoles] = useState<{ role: Role; cn: string; brain_name: string }[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [round, setRound] = useState(0)
  const [ended, setEnded] = useState<any>(null)
  const [tokens, setTokens] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef(0)
  const roundRef = useRef(0)

  useEffect(() => {
    if (!debateId) return
    setMotion(''); setEntries([]); setRound(0); setEnded(null); setTokens(0)
    seqRef.current = 0; roundRef.current = 0
    const cards: Card[] = []
    const stop = streamDebate(debateId, (type, data) => {
      if (type === 'debate.started') { setMotion(data.motion); setRoles(data.roles) }
      else if (type === 'round.started') { setRound(data.round); roundRef.current = data.round }
      else if (type === 'turn.done') {
        seqRef.current += 1
        setEntries(e => [...e, { kind: 'turn', t: data }])
        setTokens(x => x + (data.tokens || 0))
        if (data.citations?.length) onActive(data.citations)
      }
      else if (type === 'turn.rejected') {
        seqRef.current += 1
        setEntries(e => [...e, { kind: 'reject', role: data.role, reason: data.reason,
                                 round: roundRef.current, seq: seqRef.current }])
      }
      else if (type === 'card.created') { cards.push(data); onCards([...cards]) }
      else if (type === 'debate.ended') setEnded(data)
    })
    return stop                        // stop the stream on unmount — costs money
  }, [debateId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [entries.length])

  if (!debateId) return <div className="empty">preparing</div>

  const streaming = !ended
  const turns = entries.filter(e => e.kind === 'turn').length
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="theater">
      <div className="motion-block">
        <span className="mono">01 · 辩题</span>
        <h1 className={`motion${motion ? '' : ' pending'}`}>{motion || '主持人正在拟题'}</h1>
      </div>

      <div className="cast">
        {roles.map((r, i) => (
          <div key={r.role} className="cast-chip">
            <span className="mono">{pad(i + 1)} {ROLE_EN[r.role]}</span>
            <b>{ROLE_CN[r.role]}</b>
            <span className="brain">{r.brain_name ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="hud">
        {streaming && <span className="live" />}
        <span>round {pad(round)}</span>
        <span>{pad(turns)} turns</span>
        <span>{tokens} tok</span>
        {ended && <span className="end">
          {ended.reason === 'converged' ? '已收敛' : ended.reason === 'budget' ? '预算用尽' : '轮次用尽'}
        </span>}
      </div>

      <div className="stream">
        {entries.map((e, i) => e.kind === 'turn' ? (
          <div key={e.t.id} className="turn">
            <div className="turn-side">
              <span className="idx">{pad(e.t.round)}.{pad(e.t.seq + 1)}</span>
              <b>{ROLE_CN[e.t.role]}</b>
              <span className="brain">{e.t.brain_name}</span>
            </div>
            <div className="turn-main">
              <div className="turn-head">
                {e.t.stance && (
                  <span className={`stance ${e.t.stance}`}>
                    {STANCE_GLYPH[e.t.stance]} {STANCE_CN[e.t.stance] ?? e.t.stance}
                  </span>
                )}
                {e.t.novelty != null && <span className="nov">novelty {e.t.novelty.toFixed(2)}</span>}
              </div>
              <div className="turn-body">{e.t.body}</div>
              {e.t.citations.length > 0 && (
                <button className="cite" onClick={() => onCite(e.t.citations)}>
                  引用 {e.t.citations.length} 条原文 → 星图
                </button>
              )}
            </div>
          </div>
        ) : (
          <div key={`x${i}`} className="turn rejected">
            <div className="turn-side">
              <span className="idx">{pad(e.round)}.{pad(e.seq)}</span>
              <b>{ROLE_CN[e.role as Role] ?? e.role}</b>
            </div>
            <div className="turn-main">
              <div className="reason"><b>判定无效</b> · {e.reason}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
