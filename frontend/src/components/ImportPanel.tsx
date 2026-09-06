import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { ImportJob } from '../types'
import { Check, Clipboard, Close, Folder, Upload } from './Icons'

/** The one import entry. Step 1 picks a source (files / a folder such as an
 *  Obsidian vault / pasted text), step 2 names the brain, step 3 watches the
 *  job tick through 读取 → 切分 → 向量化 → 聚类 → 布局 with real counts. */
const STAGES: ImportJob['stage'][] = ['read', 'split', 'embed', 'cluster', 'layout']
const CN: Record<string, string> = { read: '读取文件', split: '切分碎片', embed: '向量化', cluster: '聚类', layout: '布局' }
const OK = /\.(md|markdown|txt|csv|org|zip|docx|pdf|html?)$/i
const SKIP = /(^|\/)(\.obsidian|\.trash|node_modules|__MACOSX|\.git)\//

export default function ImportPanel({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [pasting, setPasting] = useState(false)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [err, setErr] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const pick = (list: FileList | null) => {
    if (!list?.length) return
    const picked = Array.from(list).filter(f => OK.test(f.name) && !SKIP.test((f as any).webkitRelativePath || ''))
    if (!picked.length) { setErr('没有可读取的文件（支持 md / txt / csv / docx / pdf / html / zip）'); return }
    const top = ((picked[0] as any).webkitRelativePath || '').split('/')[0]
    const single = picked.length === 1 ? picked[0].name.replace(/\.[^.]+$/, '') : ''
    setErr(''); setFiles(picked.slice(0, 2000)); setName(top || single || '')
    setTimeout(() => nameRef.current?.focus(), 50)
  }
  const usePaste = () => {
    if (text.trim().length < 20) { setErr('粘贴的内容太短'); return }
    setErr(''); setFiles([new File([text], '粘贴.md', { type: 'text/markdown' })]); setPasting(false)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const start = async () => {
    if (!name.trim() || !files.length) return
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
  const kb = (files.reduce((n, f) => n + f.size, 0) / 1024).toFixed(0)

  return (
    <>
      <div className="scrim" onClick={!job || finished || failed ? onClose : undefined} />
      <div className="panel import" role="dialog" aria-label="导入笔记">
        <div className="panel-head">
          <span className="label">导入笔记</span>
          {(!job || finished || failed) && <button className="chip-btn small" aria-label="关闭" onClick={onClose}><Close /></button>}
        </div>

        {/* ---- step 1: source */}
        {!job && !files.length && !pasting && (
          <>
            <div className="sources">
              <label className="source">
                <Upload /><b>文件</b><span>md · txt · csv · docx · pdf · html · zip</span>
                <input type="file" multiple hidden accept=".md,.txt,.csv,.markdown,.org,.zip,.docx,.pdf,.html,.htm"
                       onChange={e => pick(e.target.files)} />
              </label>
              <label className="source">
                <Folder /><b>文件夹</b><span>Obsidian 库、Notion 导出目录</span>
                <input type="file" multiple hidden {...({ webkitdirectory: '', directory: '' } as any)}
                       onChange={e => pick(e.target.files)} />
              </label>
              <button className="source" onClick={() => setPasting(true)}>
                <Clipboard /><b>粘贴</b><span>一段文字</span>
              </button>
            </div>
            {err && <div className="label alert">{err}</div>}
          </>
        )}

        {!job && pasting && (
          <>
            <textarea className="eureka-text" value={text} autoFocus placeholder="粘贴笔记内容"
                      onChange={e => setText(e.target.value)} />
            {err && <div className="label alert">{err}</div>}
            <div className="row-actions end">
              <button className="pill ghost small" onClick={() => setPasting(false)}>返回</button>
              <button className="pill primary" onClick={usePaste} disabled={!text.trim()}>继续</button>
            </div>
          </>
        )}

        {/* ---- step 2: name */}
        {!job && files.length > 0 && (
          <>
            <div className="cells two">
              <div><span className="label">文件</span><span className="val">{files.length} 个</span></div>
              <div><span className="label">大小</span><span className="val">{kb} KB</span></div>
            </div>
            <label className="import-name">
              <span className="label">副脑名称</span>
              <input ref={nameRef} value={name} placeholder="例：工作·系统设计"
                     onChange={e => setName(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') start() }} />
            </label>
            {err && <div className="label alert">{err}</div>}
            <div className="row-actions end">
              <button className="pill ghost small" onClick={() => { setFiles([]); setName('') }}>重选</button>
              <button className="pill primary" onClick={start} disabled={!name.trim()}>开始导入</button>
            </div>
          </>
        )}

        {/* ---- step 3: progress */}
        {job && (
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
            {!finished && !failed && <div className="bar"><i style={{ width: `${pct}%` }} /></div>}
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
