import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import CardDeck from './components/CardDeck'
import DebateTheater from './components/DebateTheater'
import GalaxyView from './components/GalaxyView'
import SettingsDrawer from './components/SettingsDrawer'
import SparkBar from './components/SparkBar'
import { ArrowLeft, Moon, Sliders, Sun } from './components/Icons'
import type { Brain, Card, Spark } from './types'

type View = 'home' | 'debate'
type Theme = 'light' | 'dark'

function initTheme(): Theme {
  try {
    const s = localStorage.getItem('weave-theme')
    if (s === 'light' || s === 'dark') return s
  } catch { /* private mode */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** The 星图 is the home; capture is a command bar over it, and a debate is the
 *  one focused mode you enter and back out of. Two views, nothing stacked. */
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

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const n = prompt('这个副脑叫什么？') || '未命名副脑'
    await api.upload(n, files); reload()
  }

  const backHome = () => { setView('home'); setActive([]) }
  const noBrains = brains.length === 0

  return (
    <div className="app">
      <div className={`topbar${view === 'home' ? ' over' : ''}`}>
        <button className="brand" onClick={backHome}>
          <span className="dot" /><span className="wordmark">副脑</span><small>second brain</small>
        </button>
        {view === 'debate' && <span className="mode-title" style={{ marginLeft: 4 }}>{debateTitle}</span>}
        <div className="spacer" />
        <label className="file">
          导入
          <input type="file" multiple accept=".md,.txt,.zip" hidden
                 onChange={e => importFiles(e.target.files)} />
        </label>
        <button className="tbtn" onClick={importPaste}>粘贴</button>
        <button className="icon-btn" title="切换主题" aria-label="切换主题"
                onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
        <button className="icon-btn" title="设置" aria-label="设置" onClick={() => setSettings(true)}><Sliders /></button>
      </div>

      {view === 'home' && (
        <div className="home">
          {!noBrains && (
            <GalaxyView activeIds={active} refreshKey={refresh} theme={theme}
                        onPickChunk={id => setActive([id])} />
          )}
          {noBrains ? (
            <div className="firstrun">
              <div>
                <span className="mono">00 · 开始</span>
                <h2>导入一段笔记，建立第一个副脑。</h2>
                <p>笔记会被切成碎片、按主题聚簇，并在星图上得到一个固定的位置。</p>
                <label className="file">
                  导入笔记
                  <input type="file" multiple accept=".md,.txt,.zip" hidden
                         onChange={e => importFiles(e.target.files)} />
                </label>
              </div>
            </div>
          ) : (
            <SparkBar
              running={running}
              onDebate={startDebate}
              onSpotlight={setActive}
              onRunExample={runExample} />
          )}
          {!noBrains && (
            <div className="corners">
              <span className="c-bl">
                {new Date().toISOString().slice(0, 10)}
              </span>
              <span className="c-bc">drag rotate · wheel zoom · click drill</span>
              <span className="c-br">
                {String(brains.length).padStart(2, '0')} brains · {String(brains.reduce((n, b) => n + (b.chunk_count || 0), 0)).padStart(3, '0')} fragments
              </span>
            </div>
          )}
        </div>
      )}

      {view === 'debate' && (
        <div className="mode">
          <div className="mode-head">
            <button className="back-btn" onClick={backHome}><ArrowLeft /> 星图</button>
          </div>
          <div className="mode-body">
            <div className="debate-wrap">
              <DebateTheater debateId={debateId} onCards={setCards}
                             onActive={setActive}
                             onCite={ids => { setActive(ids); setView('home') }} />
              <CardDeck cards={cards}
                        onReplay={ids => { setActive(ids); setView('home') }}
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
