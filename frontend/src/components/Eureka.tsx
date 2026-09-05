import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Brain, Idea } from '../types'
import { Bulb, Close, Image as ImageIcon } from './Icons'

/**
 * 灵光 —— 记一个想法，就这一件事。
 *
 * 折叠时它是星图右下角一个小按钮，展开成一张便签：几个字、一段话，或者一张图 +
 * 一句说明。可以当场归到某个副脑，也可以不归 —— 不归的想法浮在星图正中的空处，
 * 「还没归位」因此是一个看得见的位置，而不是一个标记。
 *
 * 这里刻意**没有**「开始辩论」。辩论在议题台里发生；把两件事混在一个输入框里，
 * 整个产品就会显得只会等用户发问。
 */

const MAX_EDGE = 1400          // downscale before upload; the backend caps at 6MB anyway

function downscale(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const k = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.round(img.width * k), h = Math.round(img.height * k)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.82), w, h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('读不了这张图')) }
    img.src = url
  })
}

export default function Eureka({ brains, onCreated }: {
  brains: Brain[]
  onCreated: (idea: Idea) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [brainId, setBrainId] = useState<string>('')      // '' = 不归档
  const [newBrain, setNewBrain] = useState('')
  const [image, setImage] = useState<{ dataUrl: string; w: number; h: number } | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { if (open) setTimeout(() => areaRef.current?.focus(), 60) }, [open])

  const reset = () => {
    setText(''); setImage(null); setCaption(''); setNewBrain(''); setBrainId(''); setErr('')
  }

  const pickImage = async (f: File | undefined) => {
    if (!f) return
    setErr('')
    try { setImage(await downscale(f)) } catch (e: any) { setErr(e.message) }
  }

  // paste an image straight into the note — the fastest path from screenshot to idea
  const onPaste = (e: React.ClipboardEvent) => {
    const f = Array.from(e.clipboardData.files).find(x => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); pickImage(f) }
  }

  const submit = async () => {
    if (busy) return
    if (!text.trim() && !image) { setErr('写点什么，或者放一张图'); return }
    setBusy(true); setErr('')
    try {
      let bid: string | null = brainId || null
      if (newBrain.trim()) {
        // a brand-new 副脑 starts empty; the idea is its first inhabitant
        const r: any = await api.paste(newBrain.trim(), text.trim() || caption.trim() || newBrain.trim())
        bid = r?.brain?.id ?? null
      }
      const idea = await api.createIdea({
        text: text.trim(), kind: 'eureka', brain_id: bid,
        image_data_url: image?.dataUrl, image_caption: caption.trim(),
      })
      onCreated(idea)
      reset()
      setOpen(false)
    } catch (e: any) {
      setErr(String(e.message || e).slice(0, 120))
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button className="eureka-fab" onClick={() => setOpen(true)} title="记一个想法 ⌘K">
        <Bulb /><span>灵光</span>
      </button>
    )
  }

  return (
    <>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="panel eureka" role="dialog" aria-label="记一个想法">
        <div className="panel-head">
          <span className="label">灵光 · 记一个想法</span>
          <button className="chip-btn small" aria-label="关闭" onClick={() => setOpen(false)}><Close /></button>
        </div>

        <textarea ref={areaRef} className="eureka-text" value={text} onPaste={onPaste}
                  placeholder="几个字，或者一整段。写完就走，剩下的交给它。"
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
                  }} />

        {image ? (
          <div className="eureka-img">
            <img src={image.dataUrl} alt="" />
            <div className="eureka-img-meta">
              <input value={caption} placeholder="给这张图一句说明"
                     onChange={e => setCaption(e.target.value)} />
              <div className="row-actions">
                <span className="label num">{image.w}×{image.h}</span>
                <button className="pill ghost small" onClick={() => { setImage(null); setCaption('') }}>移除</button>
              </div>
            </div>
          </div>
        ) : (
          <label className="eureka-drop">
            <ImageIcon /> 加一张图（也可以直接粘贴）
            <input type="file" accept="image/*" hidden
                   onChange={e => pickImage(e.target.files?.[0])} />
          </label>
        )}

        <div className="eureka-file">
          <span className="label">归到</span>
          <div className="chips">
            <button className={`chip${!brainId && !newBrain ? ' on' : ''}`}
                    onClick={() => { setBrainId(''); setNewBrain('') }}>不归档</button>
            {brains.map(b => (
              <button key={b.id} className={`chip${brainId === b.id ? ' on' : ''}`}
                      onClick={() => { setBrainId(b.id); setNewBrain('') }}>
                <i style={{ background: b.color }} />{b.name}
              </button>
            ))}
          </div>
          <input className="eureka-new" value={newBrain} placeholder="或新建一个副脑…"
                 onChange={e => { setNewBrain(e.target.value); setBrainId('') }} />
        </div>

        {err && <div className="label alert">{err}</div>}
        <div className="row-actions end">
          <span className="label">{brainId || newBrain ? '会落在那个副脑边上' : '会浮在星图正中'}</span>
          <button className="pill primary" onClick={submit} disabled={busy}>
            {busy ? '记下中' : '记下'} <kbd>⌘⏎</kbd>
          </button>
        </div>
      </div>
    </>
  )
}
