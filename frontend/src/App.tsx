import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import BrainGauges from './components/BrainGauges'
import CardDeck from './components/CardDeck'
import DebateConsole from './components/DebateConsole'
import DebateTheater from './components/DebateTheater'
import Discoveries from './components/Discoveries'
import Eureka from './components/Eureka'
import GalaxyView from './components/GalaxyView'
import ImportPanel from './components/ImportPanel'
import { Debate as DebateIcon, Inbox, Map as MapIcon, Moon, Sliders, Sun, Upload } from './components/Icons'
import SettingsDrawer from './components/SettingsDrawer'
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
  const [active, setActiveRaw] = useState<string[]>([])
  const [activeMode, setActiveMode] = useState<'hits' | 'card'>('hits')
  const setActive = (ids: string[], mode: 'hits' | 'card' = 'hits') => { setActiveRaw(ids); setActiveMode(mode) }
  const [hitBrains, setHitBrains] = useState<Record<string, number>>({})
  const [debateId, setDebateId] = useState<string | null>(null)
  const [debateTitle, setDebateTitle] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [view, setView] = useState<View>('home')
  const [theme, setTheme] = useState<Theme>(initTheme)
  const [inboxCount, setInboxCount] = useState(0)
  const [importing, setImporting] = useState(false)

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

  // clicking a 想法 on the chart lights the fragments it is near
  const pickIdea = async (id: string) => {
    const i = await api.idea(id).catch(() => null)
    if (!i) return
    setActive(i.hits.map(h => h.chunk_id))
    const counts: Record<string, number> = {}
    i.hits.forEach(h => { counts[h.brain_id] = (counts[h.brain_id] || 0) + 1 })
    setHitBrains(counts)
  }


  const goHome = () => { setView('home') }
  const noBrains = brains.length === 0

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="副脑 首页">
          <span className="mark" /><span className="wordmark">副脑</span>
        </button>

        <div className="top-right">
          <Glass as="button" className="chip-btn" title="导入笔记" aria-label="导入笔记" onClick={() => setImporting(true)}><Upload /></Glass>
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
              <GalaxyView activeIds={active} activeMode={activeMode} refreshKey={refresh} theme={theme}
                          onClear={() => { setActive([]); setHitBrains({}) }}
                          onPickChunk={id => setActive([id])} onPickIdea={pickIdea} />
            )}
            {noBrains ? (
              <div className="firstrun">
                <div className="panel firstrun-panel">
                  <span className="label">00 · 开始</span>
                  <h2>导入一段笔记，建立第一个副脑</h2>
                  <p>笔记会被切成碎片，按主题分组，并在星图上获得固定位置。</p>
                  <button className="pill primary" onClick={() => setImporting(true)}><Upload /> 导入笔记</button>
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
                        onReplay={ids => { setActive(ids, 'card'); setView('home') }}
                        onSaved={c => setCards(cs => cs.map(x => (x.id === c.id ? c : x)))} />
            </div>
          </div>
        )}
      </main>

      {importing && <ImportPanel onDone={reload} onClose={() => setImporting(false)} />}
      {settings && <div className="scrim" onClick={() => setSettings(false)} />}
      <SettingsDrawer open={settings} onClose={() => setSettings(false)} brains={brains} onBrainsChanged={reload} />
    </div>
  )
}
