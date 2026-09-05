import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Spark } from '../types'

/**
 * Capture — a command bar over the star map. One line is the whole surface;
 * the star map behind it lights up the moment a spark resolves. ⌘K focuses,
 * Enter records, and the enriched result unfolds as a floating index card.
 */
export default function SparkBar({
  running = false, onDebate, onSpotlight, onRunExample,
}: {
  running?: boolean
  onDebate: (spark: Spark, wildness: number) => void
  onSpotlight: (chunkIds: string[]) => void
  onRunExample?: () => void
}) {
  const [text, setText] = useState('')
  const [sparks, setSparks] = useState<Spark[]>([])
  const [selected, setSelected] = useState<Spark | null>(null)
  const [wildness, setWildness] = useState(0.5)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { api.sparks().then(setSparks).catch(() => {}) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const pick = (s: Spark) => {
    setSelected(s)
    onSpotlight(s.hits.map(h => h.chunk_id))
  }

  const submit = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    const optimistic: Spark = {
      id: `tmp_${Date.now()}`, text: t, kind: 'phrase', status: 'captured',
      hits: [], created_at: new Date().toISOString(),
    }
    setSparks(s => [optimistic, ...s])
    setSelected(optimistic)
    try {
      const created = await api.createSpark(t)
      setSparks(s => [created, ...s.filter(x => x.id !== optimistic.id)])
      setSelected(created)
      poll(created.id)
    } catch {
      setSparks(s => s.map(x => (x.id === optimistic.id ? { ...x, status: 'failed' } : x)))
    }
  }

  const poll = (id: string, tries = 0) => {
    if (tries > 20) return
    setTimeout(async () => {
      const s = await api.spark(id).catch(() => null)
      if (!s) return
      setSparks(list => list.map(x => (x.id === id ? s : x)))
      setSelected(cur => (cur && cur.id === id ? s : cur))
      if (s.status === 'enriched') onSpotlight(s.hits.map(h => h.chunk_id))
      else if (s.status !== 'failed') poll(id, tries + 1)
    }, 400)
  }

  const slide = async (v: number) => {
    setWildness(v)
    if (!selected || selected.status !== 'enriched') return
    const s = await api.rehit(selected.id, v).catch(() => null)
    if (s) {
      setSelected(s)
      setSparks(list => list.map(x => (x.id === s.id ? s : x)))
      onSpotlight(s.hits.map(h => h.chunk_id))
    }
  }

  const close = () => { setSelected(null); onSpotlight([]) }
  const brainsHit = (s: Spark) => new Set(s.hits.map(h => h.brain_id)).size
  const showDrop = focused && text === '' && sparks.length > 0

  return (
    <>
      <div className="cap-pill">
        <div className="cap-row">
          <span className="glyph">✳</span>
          <input
            ref={inputRef} value={text} placeholder="记一句…"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }} />
          <button className="primary" onClick={submit}>记下</button>
        </div>

        {showDrop ? (
          <div className="cap-drop">
            <div className="dh">最近</div>
            {sparks.slice(0, 6).map(s => (
              <button key={s.id} className="recent" onMouseDown={() => pick(s)}>
                <span className={`dot ${s.status}`} />
                <span className="rtext">{s.text}</span>
                <span className="rmeta">
                  {s.status === 'enriched' ? `${brainsHit(s)} 副脑`
                    : s.status === 'captured' ? '联想中…' : s.status}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="cap-foot">
            <span><kbd>⌘K</kbd> 唤起 · 回车记录</span>
            {onRunExample && (
              <button className="link" onClick={onRunExample} disabled={running}>
                {running ? '正在开庭…' : '试一个例子'}
              </button>
            )}
          </div>
        )}
      </div>

      {selected && selected.status === 'enriched' && (
        <div className="result-card">
          <button className="rc-close" onClick={close}>✕</button>
          <div className="rc-quote">{selected.text}</div>

          {selected.skeleton && (
            <>
              <div className="skel">
                <div><span className="k">对象</span><span>{selected.skeleton.object || '—'}</span></div>
                <div><span className="k">约束</span><span>{selected.skeleton.constraint || '—'}</span></div>
                <div><span className="k">机制</span><span>{selected.skeleton.mechanism || '—'}</span></div>
                <div><span className="k">动机</span><span>{selected.skeleton.motivation || '—'}</span></div>
              </div>
              <div className="skel-note">用这副骨架检索，而不是你的原话。</div>
            </>
          )}

          <div className="hit-line">
            跳过最相似，命中 <b>{brainsHit(selected)} 个副脑</b>的 {selected.hits.length} 条中距离碎片
          </div>

          <div className="wild-inline">
            <span>保守</span>
            <input type="range" min={0} max={1} step={0.05} value={wildness}
                   onChange={e => slide(parseFloat(e.target.value))} />
            <span>疯狂</span><b>{wildness.toFixed(2)}</b>
          </div>

          <div className="result-actions">
            <button className="primary" onClick={() => onDebate(selected, wildness)}>开庭 →</button>
          </div>
        </div>
      )}
    </>
  )
}
