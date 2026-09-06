import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Brain, Idea, NightPrefs, NightStatus } from '../types'
import { STRATEGY_CN } from '../types'
import { ArrowRight, Close, Inbox, Trash } from './Icons'

/**
 * 发现 —— 夜里它自己想出来的东西，等你裁决。
 *
 * 这一屏是整个产品立场的落点：默认路径不是「你问它答」，是它自己去找题，
 * 你早上来挑。所以偏好卡在最上面（自动开庭 / 只递给我），收件箱在中间，
 * 弃稿箱折在最下面 —— 丢掉的东西要能捞回来，否则用户不敢丢。
 */
export default function Discoveries({ brains, onDebate, onChanged }: {
  brains: Brain[]
  onDebate: (idea: Idea) => void
  onChanged: () => void
}) {
  const [st, setSt] = useState<NightStatus | null>(null)
  const [inbox, setInbox] = useState<Idea[]>([])
  const [trashed, setTrashed] = useState<Idea[]>([])
  const [busy, setBusy] = useState<string>('')
  const [showTrash, setShowTrash] = useState(false)
  const [filing, setFiling] = useState<string>('')     // idea id whose 归到 row is open
  const [ticks, setTicks] = useState(0)                // remaining poll attempts
  const seen = useRef(-1)

  const reload = useCallback(async () => {
    const [s, i, t] = await Promise.all([
      api.night(), api.ideas({ status: 'inbox' }), api.ideas({ status: 'trashed' }),
    ])
    setSt(s); setInbox(i); setTrashed(t)
    // only bother the rest of the app when the count actually moved
    if (seen.current !== s.inbox) { seen.current = s.inbox; onChanged() }
  }, [onChanged])
  useEffect(() => { reload().catch(() => {}) }, [reload])

  // A night runs as a background task, so POST /run returns BEFORE it starts —
  // `running` is still false in that response. Poll on a countdown rather than
  // on the flag alone, or the first tick of every run is missed.
  useEffect(() => {
    if (ticks <= 0 && !st?.running) return
    const h = setTimeout(() => {
      reload().catch(() => {})
      setTicks(t => Math.max(0, t - 1))
    }, 1500)
    return () => clearTimeout(h)
  }, [ticks, st?.running, reload])

  const patchPrefs = async (patch: Partial<NightPrefs>) => {
    if (!st) return
    setSt(await api.putNight({ ...st.prefs, ...patch }))
  }

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    try { await fn(); await reload(); onChanged() } finally { setBusy(''); setFiling('') }
  }

  const keep = (i: Idea, brainId: string | null) =>
    act(i.id, () => api.patchIdea(i.id, { status: 'kept', brain_id: brainId }))
  const trash = (i: Idea) => act(i.id, () => api.patchIdea(i.id, { status: 'trashed' }))
  const restore = (i: Idea) => act(i.id, () => api.patchIdea(i.id, { status: 'inbox' }))
  const rephrase = (i: Idea) => act(i.id, () => api.rephrase(i.id))

  const run = async () => {
    setBusy('run')
    try {
      setSt(await api.runNight())
      setTicks(40)          // ~60s of watching; `running` keeps it going past that
    } catch { /* already running */ } finally { setBusy('') }
  }

  const p = st?.prefs
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="console">
      {/* ----------------------------------------------------- preferences */}
      <div className="panel">
        <div className="panel-head">
          <span className="label">夜间自动选题</span>
          {st?.running
            ? <span className="label acc"><i className="live" /> 运行中</span>
            : <button className="pill ghost small" onClick={run} disabled={busy === 'run'}>立即运行</button>}
        </div>

        <div className="modes">
          <button className={`mode${p?.mode === 'auto' ? ' on' : ''}`}
                  onClick={() => patchPrefs({ mode: 'auto' })}>
            <b>自动辩论</b>
            <span>选题后直接完成辩论，早上查看结果。</span>
          </button>
          <button className={`mode${p?.mode === 'suggest' ? ' on' : ''}`}
                  onClick={() => patchPrefs({ mode: 'suggest' })}>
            <b>仅提议</b>
            <span>只把题目放进收件箱，由你决定是否辩论。</span>
          </button>
        </div>

        <div className="prefs-row">
          <label><span className="label">每晚数量</span>
            <input type="number" min={1} max={10} value={p?.ideas_per_night ?? 3}
                   onChange={e => patchPrefs({ ideas_per_night: Math.max(1, Math.min(10, +e.target.value)) })} /></label>
          <label><span className="label">开始时间</span>
            <input type="number" min={0} max={23} value={p?.hour ?? 3}
                   onChange={e => patchPrefs({ hour: Math.max(0, Math.min(23, +e.target.value)) })} /></label>
          <label><span className="label">每晚 token 上限</span>
            <input type="number" min={1000} step={10000} value={p?.token_budget ?? 200000}
                   onChange={e => patchPrefs({ token_budget: Math.max(1000, +e.target.value) })} /></label>
          <label className="switch">
            <input type="checkbox" checked={!!p?.enabled}
                   onChange={e => patchPrefs({ enabled: e.target.checked })} />
            <span className="label">启用</span>
          </label>
        </div>

        <div className="prefs-note">
          <span className="label">
            {p?.enabled ? `下一次 ${st?.next_run ?? '—'}` : '已关闭，只在点击「立即运行」时执行'}
            {p?.mode === 'auto' && ' · 自动辩论会消耗 token，以上限为准'}
          </span>
          {p?.last_summary && <span className="label num">上次：{p.last_summary}</span>}
        </div>
      </div>

      {/* ---------------------------------------------------------- inbox */}
      <div className="panel">
        <div className="panel-head">
          <span className="label"><Inbox /> 收件箱</span>
          <span className="label num">{pad(inbox.length)}</span>
        </div>
        {!inbox.length && (
          <div className="label">
            {st?.running ? '运行中' : '暂无提议。每晚自动运行一次，也可以点击「立即运行」。'}
          </div>
        )}
        {inbox.map(i => (
          <div key={i.id} className={`prop${busy === i.id ? ' busy' : ''}`}>
            <div className="prop-head">
              <span className="tag">{STRATEGY_CN[i.source?.strategy ?? ''] ?? '提案'}</span>
              {i.source?.brain_names?.length === 2 && (
                <span className="label">{i.source.brain_names[0]} × {i.source.brain_names[1]}</span>
              )}
              {i.debate_id && <span className="tag ok">已辩论</span>}
            </div>
            <div className="prop-motion">{i.text}</div>
            {i.source?.why && <div className="prop-why">{i.source.why}</div>}

            {i.source?.quotes?.length === 2 && (
              <details className="card-src">
                <summary className="label">来源碎片</summary>
                {i.source.quotes.map((q, k) => (
                  <blockquote key={k}><b>{i.source!.brain_names[k]}</b><p>{q}</p></blockquote>
                ))}
              </details>
            )}

            {filing === i.id ? (
              <div className="chips">
                <button className="chip" onClick={() => keep(i, null)}>不归类</button>
                {brains.map(b => (
                  <button key={b.id} className="chip" onClick={() => keep(i, b.id)}>
                    <i style={{ background: b.color }} />{b.name}
                  </button>
                ))}
                <button className="chip-btn small" aria-label="取消" onClick={() => setFiling('')}><Close /></button>
              </div>
            ) : (
              <div className="row-actions">
                <button className="pill primary small" onClick={() => setFiling(i.id)}>收下</button>
                <button className="pill ghost small" onClick={() => rephrase(i)}>换一种说法</button>
                <button className="pill ghost small" onClick={() => onDebate(i)}>
                  {i.debate_id ? '查看辩论' : '开始辩论'} <ArrowRight />
                </button>
                <button className="pill ghost small" onClick={() => trash(i)}>丢弃</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------ 弃稿箱 */}
      <div className="panel">
        <button className="panel-head as-btn" onClick={() => setShowTrash(v => !v)}>
          <span className="label"><Trash /> 已丢弃</span>
          <span className="label num">{pad(trashed.length)} · {showTrash ? '收起' : '展开'}</span>
        </button>
        {showTrash && (
          trashed.length
            ? trashed.map(i => (
              <div key={i.id} className="recent">
                <span className="rtext">{i.text || i.image?.caption || '（图片）'}</span>
                <button className="pill ghost small" onClick={() => restore(i)}>恢复</button>
              </div>
            ))
            : <div className="label">没有丢弃的想法。</div>
        )}
      </div>
    </div>
  )
}
