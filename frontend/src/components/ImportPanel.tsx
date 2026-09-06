import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ImportJob } from '../types'
import { Check, Close } from './Icons'

/** Import as a watched job: name the brain, then see 读取 → 切分 → 向量化 →
 *  聚类 → 布局 tick past with real counts. A vault of a few hundred notes takes
 *  ten to thirty seconds; silence there reads as a hang. */
const STAGES: ImportJob['stage'][] = ['read', 'split', 'embed', 'cluster', 'layout']
const CN: Record<string, string> = { read: '读取文件', split: '切分碎片', embed: '向量化', cluster: '聚类', layout: '布局' }

export default function ImportPanel({ files, defaultName, onDone, onClose }: {
  files: File[]
  defaultName: string
  onDone: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [err, setErr] = useState('')

  const start = async () => {
    if (!name.trim()) return
    setErr('')
    try { setJob(await api.startImport(name.trim(), files)) }
    catch (e: any) { setErr(String(e.message || e).slice(0, 160)) }
  }

  useEffect(() => {
    if (!job || job.stage === 'done' || job.stage === 'failed') return
    const h = setTimeout(async () => {
      const j = await api.importStatus(job.id).catch(() => null)
      if (j) setJob(j)
    }, 350)
    return () => clearTimeout(h)
  }, [job])

  useEffect(() => { if (job?.stage === 'done') onDone() }, [job?.stage])

  const idx = job ? STAGES.indexOf(job.stage as any) : -1
  const finished = job?.stage === 'done'
  const failed = job?.stage === 'failed'
  const pct = job && job.total ? Math.round((job.done / job.total) * 100) : 0
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <>
      <div className="scrim" onClick={finished || !job ? onClose : undefined} />
      <div className="panel import" role="dialog" aria-label="导入笔记">
        <div className="panel-head">
          <span className="label">导入笔记</span>
          {(!job || finished || failed) && <button className="chip-btn small" aria-label="关闭" onClick={onClose}><Close /></button>}
        </div>

        {!job ? (
          <>
            <div className="cells two">
              <div><span className="label">文件</span><span className="val">{files.length} 个</span></div>
              <div><span className="label">大小</span><span className="val">{(files.reduce((n, f) => n + f.size, 0) / 1024).toFixed(0)} KB</span></div>
            </div>
            <label className="import-name">
              <span className="label">副脑名称</span>
              <input value={name} placeholder="例：工作·系统设计" autoFocus
                     onChange={e => setName(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') start() }} />
            </label>
            {err && <div className="label alert">{err}</div>}
            <div className="row-actions end">
              <span className="label">支持 md · txt · csv · docx · pdf · html · zip</span>
              <button className="pill primary" onClick={start} disabled={!name.trim()}>开始导入</button>
            </div>
          </>
        ) : (
          <>
            <div className="rc-quote">{job.name}</div>
            <ol className="istages">
              {STAGES.map((s, i) => {
                const state = failed && i === idx ? 'failed' : finished || i < idx ? 'done' : i === idx ? 'active' : 'todo'
                return (
                  <li key={s} className={`istage ${state}`}>
                    <span className="stage-ico">{state === 'done' ? <Check /> : <i />}</span>
                    <span className="stage-name">{CN[s]}</span>
                    <span className="label num">
                      {i === idx && !finished && job.total ? `${job.done} / ${job.total}` : ''}
                      {s === 'read' && i < idx ? `${job.files} 个文件` : ''}
                      {s === 'split' && i < idx ? `${job.total} 条碎片` : ''}
                    </span>
                  </li>
                )
              })}
            </ol>
            {!finished && !failed && (
              <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            )}
            {finished && (
              <div className="kpi-row">
                <div className="kpi"><span className="kpi-v">{pad(job.chunks ?? 0)}</span><span className="label">碎片</span></div>
                <div className="kpi"><span className="kpi-v">{pad(job.clusters ?? 0)}</span><span className="label">主题</span></div>
                <div className="kpi"><span className="kpi-v">{(job.seconds ?? 0).toFixed(1)}s</span><span className="label">用时</span></div>
              </div>
            )}
            {failed && <div className="label alert">{job.error || '导入失败'}</div>}
            {(finished || failed) && (
              <div className="row-actions end">
                <span />
                <button className="pill primary" onClick={onClose}>{finished ? '完成' : '关闭'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
