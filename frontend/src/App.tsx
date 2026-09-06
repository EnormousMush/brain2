import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import BrainGauges from './components/BrainGauges'
import CardDeck from './components/CardDeck'
import DebateConsole from './components/DebateConsole'
import DebateTheater from './components/DebateTheater'
import Discoveries from './components/Discoveries'
import Eureka from './components/Eureka'
import GalaxyView from './components/GalaxyView'
import { Clipboard, Debate as DebateIcon, Inbox, Map as MapIcon, Moon, Sliders, Sparkle, Sun, Upload } from './components/Icons'
import SettingsDrawer from './components/SettingsDrawer'
import SparkBar from './components/SparkBar'
import { Glass } from './liquidGlass'
import type { Brain, Card, Idea } from './types'

type View = 'home' | 'discover' | 'console' | 'debate'
type Theme = 'light' | 'dark'

function initTheme(): Theme {
  try {
    const s = localStorage.getItem('weave-theme')
    if (s === 'light' || s === 'dark') return s
  } catch { /* private mode */ }
  return 'dark'
}

/** HUD layout: the star chart owns the centre; capture is the top search pill;
 *  everything else is pinned to an edge — left icon rail (星图 / 发现 / 议题台 /
 *  设置), left result panel, right brain gauges, 灵光 note in the corner. */
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
  const [inboxCount, setInboxCount] = useState(0)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('weave-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const reload = useCallback(() => {
    api.brains().then(setBrains).catch(() => {})
    api.night().then(s => setInboxCount(s.inbox)).catch(() => {})
    setRefresh(x => x + 1)
  }, [])
  useEffect(reload, [reload])

  const startDebate = async (idea: Idea, wildness = 0.5) => {
    setCards([])
    setActive(idea.hits?.map(h => h.chunk_id) ?? [])
    setDebateTitle(idea.text)
    // a proposal that already had its night in court: reopen it, don't re-run
    const d = idea.debate_id
      ? await api.debate(idea.debate_id)
      : await api.createDebate(idea.id, { wildness, max_rounds: 5 })
    setDebateId(d.id)
    setView('debate')
  }

  const runExample = async () => {
    if (running) return
    setRunning(true)
    try {
      const idea = await api.createIdea({ text: '能不能把排队等电梯的调度思路，搬到即兴演奏和搬家节奏里？', kind: 'motion' })
      for (let i = 0; i < 25; i++) {
        const s = await api.idea(idea.id).catch(() => null)
        if (s?.enrichment === 'ready') { await startDebate(s, 0.6); break }
        if (s?.enrichment === 'failed') break
        await new Promise(r => setTimeout(r, 350))
      }
    } finally { setRunning(false) }
  }

  // clicking a 想法 on the chart lights the fragments it is near
  const pickIdea = async (id: string) => {
    const i = await api.idea(id).catch(() => null)
    if (!i) return
    setActive(i.hits.map(h => h.chunk_id))
    const counts: Record<string, number> = {}
    i.hits.forEach(h => { counts[h.brain_id] = (counts[h.brain_id] || 0) + 1 })
    setHitBrains(counts)
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
                      onHitBrains={setHitBrains} onRunExample={runExample} onCreated={() => setRefresh(x => x + 1)} />
          </div>
        )}

        <div className="top-right">
          {!noBrains && (
            <button className="pill primary" onClick={runExample} disabled={running}>
              <Sparkle /> {running ? '进行中' : '试一个例子'}
            </button>
          )}
          <Glass as="label" className="chip-btn" title="导入笔记" aria-label="导入笔记">
            <Upload />
            <input type="file" multiple accept=".md,.txt,.zip" hidden onChange={e => importFiles(e.target.files)} />
          </Glass>
          <Glass as="button" className="chip-btn" title="粘贴笔记" aria-label="粘贴笔记" onClick={importPaste}><Clipboard /></Glass>
          <Glass as="button" className="chip-btn" title="切换主题" aria-label="切换主题"
                 onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Glass>
        </div>
      </header>

      <Glass as="nav" className="rail" aria-label="导航">
        <button className={`rail-btn${view === 'home' ? ' active' : ''}`} title="星图" aria-label="星图" onClick={goHome}><MapIcon /></button>
        <button className={`rail-btn${view === 'discover' ? ' active' : ''}`} title="发现" aria-label="发现"
                onClick={() => setView('discover')}>
          <Inbox />
          {inboxCount > 0 && <i className="badge">{inboxCount > 9 ? '9+' : inboxCount}</i>}
        </button>
        <button className={`rail-btn${view === 'console' || view === 'debate' ? ' active' : ''}`}
                title="出题" aria-label="出题"
                onClick={() => setView(debateId ? 'debate' : 'console')}><DebateIcon /></button>
        <button className={`rail-btn${settings ? ' active' : ''}`} title="设置" aria-label="设置" onClick={() => setSettings(true)}><Sliders /></button>
      </Glass>

      <main className="stage">
        {view === 'home' && (
          <div className="home">
            {!noBrains && (
              <GalaxyView activeIds={active} refreshKey={refresh} theme={theme}
                          onPickChunk={id => setActive([id])} onPickIdea={pickIdea} />
            )}
            {noBrains ? (
              <div className="firstrun">
                <div className="panel firstrun-panel">
                  <span className="label">00 · 开始</span>
                  <h2>导入一段笔记，建立第一个副脑</h2>
                  <p>笔记会被切成碎片，按主题分组，并在星图上获得固定位置。</p>
                  <label className="pill primary">
                    <Upload /> 导入笔记
                    <input type="file" multiple accept=".md,.txt,.zip" hidden onChange={e => importFiles(e.target.files)} />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <BrainGauges brains={brains} hits={hitBrains} />
                <Eureka brains={brains} onCreated={() => reload()} />
              </>
            )}
          </div>
        )}

        {view === 'discover' && (
          <div className="debate-view">
            <div className="debate-wrap">
              <Discoveries brains={brains} onDebate={startDebate} onChanged={reload} />
            </div>
          </div>
        )}

        {view === 'console' && (
          <div className="debate-view">
            <div className="debate-wrap">
              <DebateConsole onDebate={startDebate} onSpotlight={setActive} onHitBrains={setHitBrains} />
            </div>
          </div>
        )}

        {view === 'debate' && (
          <div className="debate-view">
            <div className="debate-wrap">
              <div className="debate-title">
                <span className="label">题目</span>
                <span className="dt">{debateTitle}</span>
                <button className="pill ghost small" onClick={() => setView('console')}>换一题</button>
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
