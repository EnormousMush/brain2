import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Spark } from '../types'
import { ArrowRight, Close, Search } from './Icons'
import { Glass } from '../liquidGlass'

/**
 * Capture lives in the top bar as the search pill (the one control every
 * reference screen has). The enriched result unfolds as an edge-pinned panel
 * on the left, never over the middle of the star chart.
 */
export default function SparkBar({
  running = false, showResult = true, onDebate, onSpotlight, onHitBrains, onRunExample,
}: {
  running?: boolean
  showResult?: boolean
  onDebate: (spark: Spark, wildness: number) => void
  onSpotlight: (chunkIds: string[]) => void
  onHitBrains?: (counts: Record<string, number>) => void
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

  const light = (s: Spark | null) => {
    onSpotlight(s ? s.hits.map(h => h.chunk_id) : [])
    const counts: Record<string, number> = {}
    s?.hits.forEach(h => { counts[h.brain_id] = (counts[h.brain_id] || 0) + 1 })
    onHitBrains?.(counts)
  }

  const pick = (s: Spark) => { setSelected(s); light(s) }

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
      if (s.status === 'enriched') light(s)
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
      light(s)
    }
  }

  const close = () => { setSelected(null); light(null) }
  const brainsHit = (s: Spark) => new Set(s.hits.map(h => h.brain_id)).size
  const showDrop = focused && text === '' && sparks.length > 0
  const pad = (n: number) => String(n).padStart(2, '0')
  const pending = selected && selected.status === 'captured'

  return (
    <>
      <div className="cap">
        <Glass className={`search-pill${pending ? ' busy' : ''}`}>
          <span className="s-ico"><Search /></span>
          <input
            ref={inputRef} value={text} placeholder="此刻在想什么"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }} />
          <kbd>⌘K</kbd>
          <button className="pill dark small" onClick={submit}>记下</button>
        </Glass>
        {showDrop && (
          <Glass className="panel drop">
            <div className="panel-head"><span className="label">最近</span><span className="label num">{pad(sparks.length)}</span></div>
            {sparks.slice(0, 6).map(s => (
              <button key={s.id} className="recent" onMouseDown={() => pick(s)}>
                <span className={`dot ${s.status}`} />
                <span className="rtext">{s.text}</span>
                <span className="rmeta">
                  {s.status === 'enriched' ? `${pad(brainsHit(s))} 副脑`
                    : s.status === 'captured' ? '联想中' : s.status}
                </span>
              </button>
            ))}
          </Glass>
        )}
      </div>

      {selected && showResult && (
        <div className={`panel result${selected.status === 'enriched' ? '' : ' waiting'}`}>
          <div className="panel-head">
            <span className="label">{selected.status === 'enriched' ? '问题骨架' : '正在联想'}</span>
            <button className="chip-btn small" aria-label="关闭" onClick={close}><Close /></button>
          </div>
          <div className="rc-quote">{selected.text}</div>

          {selected.status === 'enriched' && selected.skeleton && (
            <div className="cells two">
              <div><span className="label">对象</span><span className="val">{selected.skeleton.object || '—'}</span></div>
              <div><span className="label">约束</span><span className="val">{selected.skeleton.constraint || '—'}</span></div>
              <div><span className="label">机制</span><span className="val">{selected.skeleton.mechanism || '—'}</span></div>
              <div><span className="label">动机</span><span className="val">{selected.skeleton.motivation || '—'}</span></div>
            </div>
          )}

          {selected.status === 'enriched' ? (
            <>
              <div className="kpi-row">
                <div className="kpi"><span className="kpi-v">{pad(brainsHit(selected))}</span><span className="label">副脑命中</span></div>
                <div className="kpi"><span className="kpi-v">{pad(selected.hits.length)}</span><span className="label">中距离碎片</span></div>
                <div className="kpi"><span className="kpi-v">{wildness.toFixed(2)}</span><span className="label">疯狂度</span></div>
              </div>
              <div className="slider-row">
                <span className="label">保守</span>
                <input type="range" min={0} max={1} step={0.05} value={wildness}
                       onChange={e => slide(parseFloat(e.target.value))} />
                <span className="label">疯狂</span>
              </div>
              <div className="row-actions">
                <button className="pill primary" onClick={() => onDebate(selected, wildness)}>
                  开始辩论 <ArrowRight />
                </button>
                {onRunExample && (
                  <button className="pill ghost small" onClick={onRunExample} disabled={running}>
                    {running ? '开庭中' : '试一个例子'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="label pulse">剥离领域名词 · 反相似度检索</div>
          )}
        </div>
      )}
    </>
  )
}
