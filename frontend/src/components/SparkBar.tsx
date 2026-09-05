import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Spark } from '../types'

/**
 * Eureka 模块 — capture must feel free.
 *
 *  * Cmd/Ctrl+K focuses from anywhere, Enter submits, the input clears instantly.
 *  * The row appears optimistically BEFORE the server answers; enrichment
 *    (skeleton + analogical hits) arrives by polling and lights up the graph.
 *  * The 保守<->疯狂 slider re-runs retrieval on the same spark — one number,
 *    visible effect. This is the demo's "watch it change" moment.
 */
export default function SparkBar({
  onHits, onDebate,
}: {
  onHits: (chunkIds: string[], spark: Spark | null) => void
  onDebate: (spark: Spark, wildness: number) => void
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
    setText('')                                   // clear first — never block typing
    const optimistic: Spark = {
      id: `tmp_${Date.now()}`, text: t, kind: 'phrase', status: 'captured',
      hits: [], created_at: new Date().toISOString(),
    }
    setSparks(s => [optimistic, ...s])
    try {
      const created = await api.createSpark(t)
      setSparks(s => [created, ...s.filter(x => x.id !== optimistic.id)])
      poll(created.id)
    } catch {
      setSparks(s => s.map(x => x.id === optimistic.id ? { ...x, status: 'failed' } : x))
    }
  }

  const poll = (id: string, tries = 0) => {
    if (tries > 20) return
    setTimeout(async () => {
      const s = await api.spark(id).catch(() => null)
      if (!s) return
      setSparks(list => list.map(x => (x.id === id ? s : x)))
      if (s.status === 'enriched') { setSelected(s); onHits(s.hits.map(h => h.chunk_id), s) }
      else if (s.status !== 'failed') poll(id, tries + 1)
    }, 400)
  }

  const slide = async (v: number) => {
    setWildness(v)
    if (!selected) return
    const s = await api.rehit(selected.id, v).catch(() => null)
    if (s) { setSelected(s); onHits(s.hits.map(h => h.chunk_id), s) }
  }

  return (
    <div className="sparkbar">
      <div className="spark-input">
        <input
          ref={inputRef} value={text} placeholder="随手记一句…（⌘K 唤起，回车记录）"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <button className="primary" onClick={submit}>记下</button>
      </div>

      <div className="wild">
        <span>保守</span>
        <input type="range" min={0} max={1} step={0.05} value={wildness}
               onChange={e => slide(parseFloat(e.target.value))} />
        <span>疯狂</span>
        <b>{wildness.toFixed(2)}</b>
      </div>

      <div className="spark-list">
        {sparks.slice(0, 8).map(s => (
          <div key={s.id}
               className={`spark ${selected?.id === s.id ? 'sel' : ''}`}
               onClick={() => { setSelected(s); onHits(s.hits.map(h => h.chunk_id), s) }}>
            <div className="spark-text">{s.text}</div>
            <div className="spark-meta">
              <span className={`dot ${s.status}`} />
              {s.status === 'enriched'
                ? `${new Set(s.hits.map(h => h.brain_id)).size} 个副脑命中`
                : s.status === 'captured' ? '正在联想…' : s.status}
            </div>
            {s.status === 'enriched' && (
              <button className="ghost"
                      onClick={e => { e.stopPropagation(); onDebate(s, wildness) }}>
                开庭 →
              </button>
            )}
          </div>
        ))}
      </div>

      {selected?.skeleton && (
        <div className="skeleton">
          <b>问题骨架</b>（已剥掉领域名词，我们用它检索，而不是用你的原话）
          <div>对象：{selected.skeleton.object || '—'}</div>
          <div>约束：{selected.skeleton.constraint || '—'}</div>
          <div>机制：{selected.skeleton.mechanism || '—'}</div>
          <div>动机：{selected.skeleton.motivation || '—'}</div>
        </div>
      )}
    </div>
  )
}
