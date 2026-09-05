import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Idea } from '../types'
import { ArrowRight } from './Icons'

/**
 * 议题台 —— 用户主动出题的地方，也是唯一的地方。
 *
 * 从首页顶栏搬到这里是有意的：辩论不该看起来像一个等你提问的搜索框。默认路径是
 * agent 自己在星图里找题（见 2b 的夜间发现），这里是「我偏要它们吵这个」的入口。
 *
 * 用户出的题和灵光一样会存成一条想法（kind=motion），所以它同样出现在星图上。
 */
export default function DebateConsole({ onDebate, onSpotlight, onHitBrains }: {
  onDebate: (idea: Idea, wildness: number) => void
  onSpotlight: (chunkIds: string[]) => void
  onHitBrains?: (counts: Record<string, number>) => void
}) {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selected, setSelected] = useState<Idea | null>(null)
  const [wildness, setWildness] = useState(0.5)
  const [busy, setBusy] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { api.ideas({ status: 'kept' }).then(setIdeas).catch(() => {}) }, [])

  const light = (i: Idea | null) => {
    onSpotlight(i ? i.hits.map(h => h.chunk_id) : [])
    const counts: Record<string, number> = {}
    i?.hits.forEach(h => { counts[h.brain_id] = (counts[h.brain_id] || 0) + 1 })
    onHitBrains?.(counts)
  }

  const poll = (id: string, tries = 0) => {
    if (tries > 20) return
    setTimeout(async () => {
      const i = await api.idea(id).catch(() => null)
      if (!i) return
      setIdeas(list => list.map(x => (x.id === id ? i : x)))
      setSelected(cur => (cur && cur.id === id ? i : cur))
      if (i.enrichment === 'ready') light(i)
      else if (i.enrichment !== 'failed') poll(id, tries + 1)
    }, 400)
  }

  const submit = async () => {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    try {
      const created = await api.createIdea({ text: t, kind: 'motion' })
      setText('')
      setIdeas(list => [created, ...list])
      setSelected(created)
      poll(created.id)
    } finally { setBusy(false) }
  }

  const pick = (i: Idea) => { setSelected(i); light(i) }

  const slide = async (v: number) => {
    setWildness(v)
    if (!selected || selected.enrichment !== 'ready') return
    const i = await api.rehit(selected.id, v).catch(() => null)
    if (i) { setSelected(i); setIdeas(l => l.map(x => (x.id === i.id ? i : x))); light(i) }
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const brainsHit = (i: Idea) => new Set(i.hits.map(h => h.brain_id)).size
  const waiting = selected && selected.enrichment === 'pending'

  return (
    <div className="console">
      <div className="panel">
        <div className="panel-head"><span className="label">议题台 · 我来出题</span></div>
        <p className="console-lede">
          平时不用来这里 —— 它们每晚自己在星图里找题。这里是你想指定一个题目的时候用的。
        </p>
        <textarea ref={areaRef} className="eureka-text" value={text}
                  placeholder="你想让四个副脑吵一个什么问题？"
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }} />
        <div className="row-actions end">
          <span className="label">这条题目也会记进星图</span>
          <button className="pill primary" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? '联想中' : '交给它们'} <kbd>⌘⏎</kbd>
          </button>
        </div>
      </div>

      {selected && (
        <div className={`panel${waiting ? ' waiting' : ''}`}>
          <div className="panel-head">
            <span className="label">{waiting ? '正在联想' : '问题骨架'}</span>
            <span className="label num">{selected.kind === 'motion' ? '我出的题' : '灵光'}</span>
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
                  开始辩论 <ArrowRight />
                </button>
              </div>
            </>
          ) : selected.enrichment === 'failed' ? (
            <div className="label alert">联想失败了。改一句话再试，或者检查一下模型设置。</div>
          ) : (
            <div className="label pulse">剥离领域名词 · 反相似度检索</div>
          )}
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <span className="label">你记下的</span><span className="label num">{pad(ideas.length)}</span>
        </div>
        {ideas.length === 0 && <div className="label">还没有。用右下角的「灵光」记第一个。</div>}
        {ideas.slice(0, 12).map(i => (
          <button key={i.id} className={`recent${selected?.id === i.id ? ' on' : ''}`}
                  onClick={() => pick(i)}>
            <span className={`dot ${i.enrichment}`} />
            <span className="rtext">{i.text || i.image?.caption || '（图片）'}</span>
            <span className="rmeta">
              {i.debate_id ? '已开庭'
                : i.enrichment === 'ready' ? `${pad(brainsHit(i))} 副脑`
                : i.enrichment === 'pending' ? '联想中' : '失败'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
