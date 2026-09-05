import { useEffect, useRef, useState } from 'react'
import { streamDebate } from '../api'
import { ROLE_CN, STANCE_CN, STANCE_COLOR } from '../types'
import type { Card, Role, Turn } from '../types'

/**
 * 副脑辩论剧场. The debate IS the demo, so it must arrive one turn at a time —
 * a spinner followed by a wall of text kills the room. Everything below renders
 * off the SSE stream from /api/debates/{id}/stream.
 *
 * The two things a judge should notice without being told:
 *   * each speaker is a named 副脑, not "Agent 2"
 *   * rejected turns are shown, greyed, with the reason ("复读"、"怀疑者必须
 *     attack"). Visible refereeing is the proof that this is not a nodding circle.
 */
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
  const [turns, setTurns] = useState<Turn[]>([])
  const [rejects, setRejects] = useState<{ role: string; reason: string }[]>([])
  const [round, setRound] = useState(0)
  const [ended, setEnded] = useState<any>(null)
  const [tokens, setTokens] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!debateId) return
    setMotion(''); setTurns([]); setRejects([]); setRound(0); setEnded(null); setTokens(0)
    const cards: Card[] = []
    const stop = streamDebate(debateId, (type, data) => {
      if (type === 'debate.started') { setMotion(data.motion); setRoles(data.roles) }
      else if (type === 'round.started') setRound(data.round)
      else if (type === 'turn.done') {
        setTurns(t => [...t, data])
        setTokens(x => x + (data.tokens || 0))
        if (data.citations?.length) onActive(data.citations)
      }
      else if (type === 'turn.rejected') setRejects(r => [...r, data])
      else if (type === 'card.created') { cards.push(data); onCards([...cards]) }
      else if (type === 'debate.ended') setEnded(data)
    })
    return stop                        // stop the stream on unmount — costs money
  }, [debateId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns.length])

  if (!debateId) return <div className="empty">正在准备辩论…</div>

  const streaming = !ended

  return (
    <div className="theater">
      <div className="motion">
        <span className="tag">辩题</span>{motion || '主持人正在拟题…'}
      </div>

      <div className="cast">
        {roles.map(r => (
          <div key={r.role} className="cast-chip">
            <b>{ROLE_CN[r.role]}</b>
            <span>{r.brain_name ?? '—'}</span>
          </div>
        ))}
      </div>

      <div className="hud">
        {streaming && <span className="live" />}
        第 {round} 轮 · {turns.length} 次发言 · ~{tokens} tokens
        {ended && <> · {ended.reason === 'converged' ? '已收敛'
          : ended.reason === 'budget' ? '预算用尽' : '轮次用尽'}</>}
      </div>

      <div className="stream">
        {turns.map(t => (
          <div key={t.id} className="turn"
               style={{ borderLeftColor: STANCE_COLOR[t.stance ?? 'summary'] }}>
            <div className="turn-head">
              <b>{ROLE_CN[t.role]}</b>
              <span className="brain">{t.brain_name}</span>
              <span className="stance">{t.stance ? STANCE_CN[t.stance] ?? t.stance : ''}</span>
              {t.novelty != null && <span className="nov">新意 {t.novelty.toFixed(2)}</span>}
            </div>
            <div className="turn-body">{t.body}</div>
            {t.citations.length > 0 && (
              <button className="cite" onClick={() => onCite(t.citations)}>
                引用了 {t.citations.length} 条你的原文 → 在图上看
              </button>
            )}
          </div>
        ))}
        {rejects.map((r, i) => (
          <div key={`x${i}`} className="turn rejected">
            <b>{ROLE_CN[r.role as Role] ?? r.role}</b> 的发言被判无效：{r.reason}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
