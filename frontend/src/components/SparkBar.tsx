import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Idea } from '../types'
import { ArrowRight, Close, Search } from './Icons'
import { Glass } from '../liquidGlass'

/**
 * Quick capture in the top bar. One line = one 灵光 (kind "eureka"), stored as
 * an idea: it lands on the chart, gets a skeleton and analogical hits in the
 * background, and can be sent to court from the result panel. The richer
 * note (image, filing to a brain) lives in the 灵光 button; the deliberate
 * "I want them to argue THIS" entry is 议题台.
 */
export default function SparkBar({
  running = false, showResult = true, onDebate, onSpotlight, onHitBrains, onRunExample, onCreated,
}: {
  running?: boolean
  showResult?: boolean
  onDebate: (idea: Idea, wildness: number) => void
  onSpotlight: (chunkIds: string[]) => void
  onHitBrains?: (counts: Record<string, number>) => void
  onRunExample?: () => void
  onCreated?: () => void
}) {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selected, setSelected] = useState<Idea | null>(null)
  const [wildness, setWildness] = useState(0.5)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { api.ideas({ status: 'kept' }).then(setIdeas).catch(() => {}) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const light = (i: Idea | null) => {
    onSpotlight(i ? i.hits.map(h => h.chunk_id) : [])
    const counts: Record<string, number> = {}
    i?.hits.forEach(h => { counts[h.brain_id] = (counts[h.brain_id] || 0) + 1 })
    onHitBrains?.(counts)
  }

  const pick = (i: Idea) => { setSelected(i); light(i) }

  const submit = async () => {
    const t = text.trim()
    if (!t) return
    setText('')
    const optimistic: Idea = {
      id: `tmp_${Date.now()}`, text: t, origin: 'user', kind: 'eureka', status: 'kept',
      enrichment: 'pending', hits: [], created_at: new Date().toISOString(),
    }
    setIdeas(s => [optimistic, ...s])
    setSelected(optimistic)
    try {
      const created = await api.createIdea({ text: t, kind: 'eureka' })
      setIdeas(s => [created, ...s.filter(x => x.id !== optimistic.id)])
      setSelected(created)
      onCreated?.()
      poll(created.id)
    } catch {
      setIdeas(s => s.map(x => (x.id === optimistic.id ? { ...x, enrichment: 'failed' } : x)))
    }
  }

  const poll = (id: string, tries = 0) => {
    if (tries > 20) return
    setTimeout(async () => {
      const i = await api.idea(id).catch(() => null)
      if (!i) return
      setIdeas(list => list.map(x => (x.id === id ? i : x)))
      setSelected(cur => (cur && cur.id === id ? i : cur))
      if (i.enrichment === 'ready') { light(i); onCreated?.() }
      else if (i.enrichment !== 'failed') poll(id, tries + 1)
    }, 400)
  }

  const slide = async (v: number) => {
    setWildness(v)
    if (!selected || selected.enrichment !== 'ready') return
    const i = await api.rehit(selected.id, v).catch(() => null)
    if (i) {
      setSelected(i)
      setIdeas(list => list.map(x => (x.id === i.id ? i : x)))
      light(i)
    }
  }

  const close = () => { setSelected(null); light(null) }
  const brainsHit = (i: Idea) => new Set(i.hits.map(h => h.brain_id)).size
  const showDrop = focused && text === '' && ideas.length > 0
  const pad = (n: number) => String(n).padStart(2, '0')
  const pending = selected && selected.enrichment === 'pending'

  return (
    <>
      <div className="cap">
        <Glass className={`search-pill${pending ? ' busy' : ''}`}>
          <span className="s-ico"><Search /></span>
          <input
            ref={inputRef} value={text} placeholder="记一个想法"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }} />
          <kbd>⌘K</kbd>
          <button className="pill dark small" onClick={submit}>记下</button>
        </Glass>
        {showDrop && (
          <Glass className="panel drop">
            <div className="panel-head"><span className="label">已保存的想法</span><span className="label num">{pad(ideas.length)}</span></div>
            {ideas.slice(0, 6).map(i => (
              <button key={i.id} className="recent" onMouseDown={() => pick(i)}>
                <span className={`dot ${i.enrichment}`} />
                <span className="rtext">{i.text || i.image?.caption || '（图片）'}</span>
                <span className="rmeta">
                  {i.debate_id ? '已辩论'
                    : i.enrichment === 'ready' ? `${pad(brainsHit(i))} 副脑`
                    : i.enrichment === 'pending' ? '检索中' : '失败'}
                </span>
              </button>
            ))}
          </Glass>
        )}
      </div>

      {selected && showResult && (
        <div className={`panel result${selected.enrichment === 'ready' ? '' : ' waiting'}`}>
          <div className="panel-head">
            <span className="label">{selected.enrichment === 'ready' ? '问题骨架' : selected.enrichment === 'failed' ? '检索失败' : '检索中'}</span>
            <button className="chip-btn small" aria-label="关闭" onClick={close}><Close /></button>
          </div>
          <div className="rc-quote">{selected.text}</div>

          {selected.enrichment === 'ready' && selected.skeleton && (
            <div className="cells two">
              <div><span className="label">对象</span><span className="val">{selected.skeleton.object || '—'}</span></div>
              <div><span className="label">约束</span><span className="val">{selected.skeleton.constraint || '—'}</span></div>
              <div><span className="label">机制</span><span className="val">{selected.skeleton.mechanism || '—'}</span></div>
              <div><span className="label">动机</span><span className="val">{selected.skeleton.motivation || '—'}</span></div>
            </div>
          )}

          {selected.enrichment === 'ready' ? (
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
                  {selected.debate_id ? '查看辩论' : '开始辩论'} <ArrowRight />
                </button>
                {onRunExample && (
                  <button className="pill ghost small" onClick={onRunExample} disabled={running}>
                    {running ? '进行中' : '试一个例子'}
                  </button>
                )}
              </div>
            </>
          ) : selected.enrichment === 'failed' ? (
            <div className="label alert">检索失败。换个说法再试，或检查模型设置。</div>
          ) : (
            <div className="label pulse">正在提取问题结构并检索</div>
          )}
        </div>
      )}
    </>
  )
}
