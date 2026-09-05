import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Brain, ProviderConfig, SettingsView } from '../types'

const PRESETS: Record<string, Partial<ProviderConfig>> = {
  OpenAI: { kind: 'openai_compat', base_url: 'https://api.openai.com/v1', chat_model: 'gpt-4o-mini', embed_model: 'text-embedding-3-small' },
  DeepSeek: { kind: 'openai_compat', base_url: 'https://api.deepseek.com/v1', chat_model: 'deepseek-chat' },
  Kimi: { kind: 'openai_compat', base_url: 'https://api.moonshot.cn/v1', chat_model: 'moonshot-v1-8k' },
  通义千问: { kind: 'openai_compat', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', chat_model: 'qwen-plus', embed_model: 'text-embedding-v3' },
  Claude: { kind: 'anthropic', base_url: 'https://api.anthropic.com/v1', chat_model: 'claude-sonnet-4-20250514' },
  Ollama本地: { kind: 'openai_compat', base_url: 'http://localhost:11434/v1', chat_model: 'qwen2.5:7b', embed_model: 'bge-m3' },
}

/** BYOK + 隐私页. The delete button is not decoration — demo it live. */
export default function SettingsDrawer({
  open, onClose, brains, onBrainsChanged,
}: {
  open: boolean; onClose: () => void
  brains: Brain[]; onBrainsChanged: () => void
}) {
  const [s, setS] = useState<SettingsView | null>(null)
  const [privacy, setPrivacy] = useState<{ storage: string; statements: string[] } | null>(null)
  const [draft, setDraft] = useState<ProviderConfig[]>([])

  useEffect(() => {
    if (!open) return
    api.settings().then(v => { setS(v); setDraft(v.providers) })
    api.privacy().then(setPrivacy)
  }, [open])

  if (!open) return null

  const addPreset = (name: string) => {
    const p = PRESETS[name]
    setDraft(d => [...d, {
      id: `${name}-${d.length + 1}`, kind: 'openai_compat', chat_model: 'gpt-4o-mini',
      ...p, api_key: '',
    } as ProviderConfig])
  }

  const save = async () => {
    const v = await api.putSettings({
      providers: draft,
      default_chat: s?.default_chat ?? draft[0]?.id,
      default_embed: s?.default_embed ?? draft.find(d => d.embed_model)?.id,
      moderator_provider: s?.moderator_provider ?? draft[0]?.id,
    })
    setS(v); setDraft(v.providers)
  }

  return (
    <div className="drawer">
      <div className="drawer-head">
        <b>设置</b><button className="quiet mono" onClick={onClose}>close</button>
      </div>

      <section>
        <h4>模型（你自己的 Key，存在本机）</h4>
        <div className="presets">
          {Object.keys(PRESETS).map(k =>
            <button key={k} className="ghost" onClick={() => addPreset(k)}>+ {k}</button>)}
        </div>
        {draft.map((p, i) => (
          <div key={i} className="prov">
            <input value={p.id} placeholder="名称"
                   onChange={e => upd(i, { id: e.target.value })} />
            <input value={p.base_url ?? ''} placeholder="base_url"
                   onChange={e => upd(i, { base_url: e.target.value })} />
            <input value={p.chat_model} placeholder="chat model"
                   onChange={e => upd(i, { chat_model: e.target.value })} />
            <input value={p.embed_model ?? ''} placeholder="embed model（可留空）"
                   onChange={e => upd(i, { embed_model: e.target.value })} />
            <input type="password" placeholder={p.has_key ? '（已保存，留空不改）' : 'API Key'}
                   onChange={e => upd(i, { api_key: e.target.value })} />
            <button className="ghost" onClick={() => setDraft(d => d.filter((_, j) => j !== i))}>
              删除
            </button>
          </div>
        ))}
        <button className="primary" onClick={save}>保存</button>
        {s?.offline && <p className="warn">当前是离线模式（WEAVE_OFFLINE=1），全部走 mock，不联网。</p>}
      </section>

      <section>
        <h4>副脑 → 用哪个模型代理</h4>
        <p className="hint">不同副脑绑不同厂商，辩论时才有真正的异质性。</p>
        {brains.map((b, i) => (
          <div key={b.id} className="bind">
            <span className={`chip ${['solid', 'screen', 'outline'][i % 3]}`}>{b.name}</span>
            <select value={b.provider ?? ''}
                    onChange={e => api.patchBrain(b.id, { provider: e.target.value || null })
                      .then(onBrainsChanged)}>
              <option value="">默认</option>
              {(s?.providers ?? []).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </div>
        ))}
      </section>

      <section className="privacy">
        <h4>你的数据在哪</h4>
        <ul>{privacy?.statements.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <code>{privacy?.storage}</code>
        <button className="danger" onClick={async () => {
          if (!confirm('这会永久删除所有副脑、碎念、辩论记录。继续？')) return
          await api.wipe(); onBrainsChanged()
        }}>删除我的副脑</button>
      </section>
    </div>
  )

  function upd(i: number, patch: Partial<ProviderConfig>) {
    setDraft(d => d.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  }
}
