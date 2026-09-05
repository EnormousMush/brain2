import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import BrainGauges from './components/BrainGauges'
import CardDeck from './components/CardDeck'
import DebateTheater from './components/DebateTheater'
import GalaxyView from './components/GalaxyView'
import { Clipboard, Debate as DebateIcon, Map as MapIcon, Moon, Sliders, Sparkle, Sun, Upload } from './components/Icons'
import SettingsDrawer from './components/SettingsDrawer'
import SparkBar from './components/SparkBar'
import type { Brain, Card, Spark } from './types'

type View = 'home' | 'debate'
type Theme = 'light' | 'dark'

function initTheme(): Theme {
  try {
    const s = localStorage.getItem('weave-theme')
    if (s === 'light' || s === 'dark') return s
  } catch { /* private mode */ }
  return 'dark'
}

/** HUD layout: the star chart owns the center; capture is the top search pill;
 *  everything else is pinned to an edge — left icon rail, left result panel,
 *  right brain gauges, bottom metadata band. A debate is the one other view. */
export default function App() {
  const [brains, setBrains] = useState<Brain[]>([])
  const [active, setActive] = useState<string[]>([])
  const [hitBrains, setHitBrains] = useState<Record<string, number>>({})
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

  const runExample = async () => {
    if (running) return
    setRunning(true)
    try {
      const spark = await api.createSpark('能不能把排队等电梯的调度思路，搬到即兴演奏和搬家节奏里？')
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

  const goHome = () => { setView('home') }
  const noBrains = brains.length === 0

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="副脑 首页">
          <span className="mark" /><span className="wordmark">副脑</span>
        </button>

        {!noBrains && (
          <div className="top-center">
            <SparkBar running={running} showResult={view === 'home'} onDebate={startDebate} onSpotlight={setActive}
                      onHitBrains={setHitBrains} onRunExample={runExample} />
          </div>
        )}

        <div className="top-right">
          {!noBrains && (
            <button className="pill primary" onClick={runExample} disabled={running}>
              <Sparkle /> {running ? '开庭中' : '试一个例子'}
            </button>
          )}
          <label className="chip-btn" title="导入笔记" aria-label="导入笔记">
            <Upload />
            <input type="file" multiple accept=".md,.txt,.zip" hidden onChange={e => importFiles(e.target.files)} />
          </label>
          <button className="chip-btn" title="粘贴笔记" aria-label="粘贴笔记" onClick={importPaste}><Clipboard /></button>
          <button className="chip-btn" title="切换主题" aria-label="切换主题"
                  onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      <nav className="rail glass" aria-label="导航">
        <button className={`rail-btn${view === 'home' ? ' active' : ''}`} title="星图" aria-label="星图" onClick={goHome}><MapIcon /></button>
        <button className={`rail-btn${view === 'debate' ? ' active' : ''}`} title="辩论" aria-label="辩论"
                disabled={!debateId} onClick={() => setView('debate')}><DebateIcon /></button>
        <button className={`rail-btn${settings ? ' active' : ''}`} title="设置" aria-label="设置" onClick={() => setSettings(true)}><Sliders /></button>
      </nav>

      <main className="stage">
        {view === 'home' && (
          <div className="home">
            {!noBrains && (
              <GalaxyView activeIds={active} refreshKey={refresh} theme={theme}
                          onPickChunk={id => setActive([id])} />
            )}
            {noBrains ? (
              <div className="firstrun">
                <div className="panel firstrun-panel">
                  <span className="label">00 · 开始</span>
                  <h2>导入一段笔记，建立第一个副脑。</h2>
                  <p>笔记会被切成碎片、按主题聚簇，并在星图上得到一个固定的位置。</p>
                  <label className="pill primary">
                    <Upload /> 导入笔记
                    <input type="file" multiple accept=".md,.txt,.zip" hidden onChange={e => importFiles(e.target.files)} />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <BrainGauges brains={brains} hits={hitBrains} onOpenSettings={() => setSettings(true)} />
              </>
            )}
          </div>
        )}

        {view === 'debate' && (
          <div className="debate-view">
            <div className="debate-wrap">
              <div className="debate-title">
                <span className="label">碎念</span>
                <span className="dt">{debateTitle}</span>
              </div>
              <DebateTheater debateId={debateId} onCards={setCards} onActive={setActive}
                             onCite={ids => { setActive(ids); setView('home') }} />
              <CardDeck cards={cards}
                        onReplay={ids => { setActive(ids); setView('home') }}
                        onSaved={c => setCards(cs => cs.map(x => (x.id === c.id ? c : x)))} />
            </div>
          </div>
        )}
      </main>

      {settings && <div className="scrim" onClick={() => setSettings(false)} />}
      <SettingsDrawer open={settings} onClose={() => setSettings(false)} brains={brains} onBrainsChanged={reload} />
    </div>
  )
}
