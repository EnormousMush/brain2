import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import CardDeck from './components/CardDeck'
import DebateTheater from './components/DebateTheater'
import GalaxyView from './components/GalaxyView'
import SettingsDrawer from './components/SettingsDrawer'
import SparkBar from './components/SparkBar'
import type { Brain, Card, Spark } from './types'

type View = 'home' | 'debate' | 'galaxy'
type Theme = 'light' | 'dark'

function initTheme(): Theme {
  try {
    const s = localStorage.getItem('weave-theme')
    if (s === 'light' || s === 'dark') return s
  } catch { /* private mode */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** One product, three jobs — but only ever one on screen. Home is capture;
 *  the galaxy and each debate are focused modes you enter and back out of. */
export default function App() {
  const [brains, setBrains] = useState<Brain[]>([])
  const [active, setActive] = useState<string[]>([])
  const [debateId, setDebateId] = useState<string | null>(null)
  const [debateTitle, setDebateTitle] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [running, setRunning] = useState(false)
  const [view, setView] = useState<View>('home')
  const [theme, setTheme] = useState<Theme>(initTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('weave-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const reload = useCallback(() => {
    api.brains().then(setBrains).catch(() => {})
    setRefresh(x => x + 1)
  }, [])
  useEffect(reload, [reload])

  const startDebate = async (spark: Spark, wildness: number) => {
    setCards([])
    setActive(spark.hits?.map(h => h.chunk_id) ?? [])
    setDebateTitle(spark.text)
    const d = await api.createDebate(spark.id, { wildness, max_rounds: 5 })
    setDebateId(d.id)
    setView('debate')
  }

  const showGalaxy = (chunkIds?: string[]) => {
    if (chunkIds) setActive(chunkIds)
    setView('galaxy')
  }

  /** Bulletproof one-click demo: capture a curated cross-domain spark, wait for
   *  the anti-similarity retrieval, then open the debate. */
  const runExample = async () => {
    if (running) return
    setRunning(true)
    try {
      const spark = await api.createSpark(
        '能不能把排队等电梯的调度思路，搬到即兴演奏和搬家节奏里？')
      for (let i = 0; i < 25; i++) {
        const s = await api.spark(spark.id).catch(() => null)
        if (s?.status === 'enriched') { await startDebate(s, 0.6); break }
        if (s?.status === 'failed') break
        await new Promise(r => setTimeout(r, 350))
      }
    } finally { setRunning(false) }
  }

  const importPaste = async () => {
    const name = prompt('这个副脑叫什么？（例：工作·系统设计）')
    if (!name) return
    const text = prompt('粘贴一段笔记：')
    if (!text) return
    await api.paste(name, text)
    reload()
  }

  const backHome = () => { setView('home'); setActive([]) }

  return (
    <div className="app">
      <div className="topbar">
        <button className="brand" onClick={backHome}>
          <span className="dot" /> weave <small>副脑</small>
        </button>
        <div className="spacer" />
        <button className="icon-btn" title="切换主题"
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button className="icon-btn" title="设置" onClick={() => setSettings(true)}>⚙</button>
      </div>

      {view === 'home' && (
        <div className="home">
          <SparkBar
            hasBrains={brains.length > 0}
            running={running}
            onDebate={startDebate}
            onShowGalaxy={showGalaxy}
            onRunExample={runExample} />
          <div className="capture" style={{ marginTop: 0 }}>
            <div className="brains-strip">
              {brains.map(b => (
                <span key={b.id} className="chip" style={{ background: b.color }}>
                  {b.name} <i>{b.chunk_count}</i>
                </span>
              ))}
              <div className="spacer" />
              {brains.length > 0 && (
                <button className="ghost" onClick={() => showGalaxy()}>星图 →</button>
              )}
              <label className="file">
                导入
                <input type="file" multiple accept=".md,.txt,.zip" hidden
                       onChange={async e => {
                         if (!e.target.files?.length) return
                         const n = prompt('这个副脑叫什么？') || '未命名副脑'
                         await api.upload(n, e.target.files); reload()
                       }} />
              </label>
              <button className="ghost" onClick={importPaste}>粘贴</button>
            </div>
          </div>
        </div>
      )}

      {view === 'galaxy' && (
        <div className="mode galaxy">
          <div className="mode-head">
            <button className="back-btn" onClick={backHome}>← 返回</button>
          </div>
          <div className="mode-body flush">
            <GalaxyView activeIds={active} refreshKey={refresh} theme={theme}
                        onPickChunk={id => setActive([id])} />
          </div>
        </div>
      )}

      {view === 'debate' && (
        <div className="mode">
          <div className="mode-head">
            <button className="back-btn" onClick={backHome}>← 返回</button>
            <span className="mode-title">{debateTitle}</span>
          </div>
          <div className="mode-body">
            <div className="debate-wrap">
              <DebateTheater debateId={debateId} onCards={setCards}
                             onActive={setActive}
                             onCite={ids => showGalaxy(ids)} />
              <CardDeck cards={cards} onReplay={ids => showGalaxy(ids)}
                        onSaved={c => setCards(cs => cs.map(x => (x.id === c.id ? c : x)))} />
            </div>
          </div>
        </div>
      )}

      {settings && <div className="scrim" onClick={() => setSettings(false)} />}
      <SettingsDrawer open={settings} onClose={() => setSettings(false)}
                      brains={brains} onBrainsChanged={reload} />
    </div>
  )
}
