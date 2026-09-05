import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Spark } from '../types'

/**
 * Capture — the home. One quiet input is the whole surface area; everything
 * else (skeleton, anti-similarity hits, actions) unfolds under it only once a
 * spark has something to show. ⌘K focuses from anywhere; Enter records.
 */
export default function SparkBar({
  hasBrains = true, running = false, onDebate, onShowGalaxy, onRunExample,
}: {
  hasBrains?: boolean
  running?: boolean
  onDebate: (spark: Spark, wildness: number) => void
  onShowGalaxy: (chunkIds: string[]) => void
  onRunExample?: () => void
}) {
  const [text, setText] = useState('')
  const [sparks, setSparks] = useState<Spark[]>([])
  const [selected, setSelected] = useState<Spark | null>(null)
  const [wildness, setWildness] = useState(0.5)
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
      if (s.status !== 'enriched' && s.status !== 'failed') poll(id, tries + 1)
    }, 400)
  }

  const slide = async (v: number) => {
    setWildness(v)
    if (!selected || selected.status !== 'enriched') return
    const s = await api.rehit(selected.id, v).catch(() => null)
    if (s) {
      setSelected(s)
      setSparks(list => list.map(x => (x.id === s.id ? s : x)))
    }
  }

  const brainsHit = (s: Spark) => new Set(s.hits.map(h => h.brain_id)).size

  return (
    <div className="capture">
      <div className="hero-prompt">
        此刻<span className="muted">在想什么？</span>
      </div>
      <div className="capture-input">
        <input
          ref={inputRef} value={text} autoFocus
          placeholder="随手记一句…"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }} />
        <button className="primary" onClick={submit}>记下</button>
      </div>
      <div className="cap-sub">
        {hasBrains ? (
          <>⌘K 唤起 · 回车记录{onRunExample && <> · <button className="link"
            onClick={onRunExample} disabled={running}>
            {running ? '正在开庭…' : '试一个例子'}</button></>}</>
        ) : '先导入一段笔记，建立你的第一个副脑。'}
      </div>

      {selected && selected.status === 'enriched' && (
        <div className="result">
          <div className="result-quote">{selected.text}</div>

          {selected.skeleton && (
            <>
              <div className="skel">
                <div><span className="k">对象</span><span className="v">{selected.skeleton.object || '—'}</span></div>
                <div><span className="k">约束</span><span className="v">{selected.skeleton.constraint || '—'}</span></div>
                <div><span className="k">机制</span><span className="v">{selected.skeleton.mechanism || '—'}</span></div>
                <div><span className="k">动机</span><span className="v">{selected.skeleton.motivation || '—'}</span></div>
              </div>
              <div className="skel-note">已剥掉领域名词——我们用这副骨架检索，而不是你的原话。</div>
            </>
          )}

          <div className="hit-line">
            跳过最相似的结果，命中 <b>{brainsHit(selected)} 个副脑</b>的 {selected.hits.length} 条中距离碎片
          </div>

          <div className="wild-inline">
            <span>保守</span>
            <input type="range" min={0} max={1} step={0.05} value={wildness}
                   onChange={e => slide(parseFloat(e.target.value))} />
            <span>疯狂</span><b>{wildness.toFixed(2)}</b>
          </div>

          <div className="result-actions">
            <button className="primary" onClick={() => onDebate(selected, wildness)}>开庭 →</button>
            <button className="ghost" onClick={() => onShowGalaxy(selected.hits.map(h => h.chunk_id))}>
              在星图看
            </button>
          </div>
        </div>
      )}

      {sparks.length > 0 && (
        <div className="recents">
          <div className="recents-head">最近</div>
          {sparks.slice(0, 6).map(s => (
            <button key={s.id} className="recent" onClick={() => setSelected(s)}>
              <span className={`dot ${s.status}`} />
              <span className="rtext">{s.text}</span>
              <span className="rmeta">
                {s.status === 'enriched' ? `${brainsHit(s)} 副脑`
                  : s.status === 'captured' ? '联想中…' : s.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
