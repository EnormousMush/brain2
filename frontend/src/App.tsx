import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import CardDeck from './components/CardDeck'
import DebateTheater from './components/DebateTheater'
import GalaxyView from './components/GalaxyView'
import SettingsDrawer from './components/SettingsDrawer'
import SparkBar from './components/SparkBar'
import type { Brain, Card, Spark } from './types'

/** One screen. Left = the map, right = the debate, bottom-left = capture.
 *  Never make the judge navigate. */
export default function App() {
  const [brains, setBrains] = useState<Brain[]>([])
  const [active, setActive] = useState<string[]>([])
  const [debateId, setDebateId] = useState<string | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [settings, setSettings] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const reload = useCallback(() => {
    api.brains().then(setBrains).catch(() => {})
    setRefresh(x => x + 1)
  }, [])
  useEffect(reload, [reload])
  useEffect(() => { api.cards().then(setCards).catch(() => {}) }, [])

  const startDebate = async (spark: Spark, wildness: number) => {
    setCards([])
    const d = await api.createDebate(spark.id, { wildness, max_rounds: 5 })
    setDebateId(d.id)
  }

  const importPaste = async () => {
    const name = prompt('这个副脑叫什么？（例：工作·系统设计）')
    if (!name) return
    const text = prompt('粘贴一段笔记：')
    if (!text) return
    await api.paste(name, text)
    reload()
  }

  return (
    <div className="app">
      <header>
        <b>Weave</b><span className="sub">· 你的副脑群</span>
        <div className="spacer" />
        {brains.map(b => (
          <span key={b.id} className="chip" style={{ background: b.color }}>
            {b.name} <i>{b.chunk_count}</i>
          </span>
        ))}
        <label className="ghost file">
          导入笔记
          <input type="file" multiple accept=".md,.txt,.zip" hidden
                 onChange={async e => {
                   if (!e.target.files?.length) return
                   const n = prompt('这个副脑叫什么？') || '未命名副脑'
                   await api.upload(n, e.target.files); reload()
                 }} />
        </label>
        <button className="ghost" onClick={importPaste}>粘贴</button>
        <button className="ghost" onClick={() => setSettings(true)}>设置</button>
      </header>

      <main>
        <section className="left">
          <GalaxyView activeIds={active} refreshKey={refresh}
                      onPickChunk={id => setActive([id])} />
          <SparkBar onHits={ids => setActive(ids)} onDebate={startDebate} />
        </section>

        <section className="right">
          <DebateTheater debateId={debateId} onCards={setCards}
                         onCite={ids => setActive(ids)} />
          <CardDeck cards={cards} onReplay={setActive}
                    onSaved={c => setCards(cs => cs.map(x => (x.id === c.id ? c : x)))} />
        </section>
      </main>

      <SettingsDrawer open={settings} onClose={() => setSettings(false)}
                      brains={brains} onBrainsChanged={reload} />
    </div>
  )
}
