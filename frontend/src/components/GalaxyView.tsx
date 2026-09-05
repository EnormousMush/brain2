import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'

/** A crisp always-on text label as a camera-facing sprite. Built from a canvas
 *  so we need no extra dependency (three is already here for the graph). */
function makeLabel(text: string, color: string, dim: boolean, shadow: string): THREE.Sprite {
  const fs = 48, pad = 10
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const measure = document.createElement('canvas').getContext('2d')!
  const font = `700 ${fs}px "IBM Plex Serif", "Songti SC", "Noto Serif SC", Georgia, serif`
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width) + pad * 2
  const h = fs + pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr; canvas.height = h * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.shadowColor = shadow; ctx.shadowBlur = 7
  ctx.fillStyle = color
  ctx.globalAlpha = dim ? 0.3 : 1
  ctx.fillText(text, pad, h / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  const scale = 0.34
  sprite.scale.set(w * scale, h * scale, 1)
  return sprite
}

/** A flat printed disc: no lighting, no gloss. The map should read like ink
 *  on paper, not like a planetarium. */
const DISC_CACHE = new Map<string, THREE.Texture>()
function discTexture(color: string): THREE.Texture {
  let t = DISC_CACHE.get(color)
  if (t) return t
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill()
  t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter
  DISC_CACHE.set(color, t)
  return t
}
function makeDisc(color: string, r: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(color), transparent: true, depthWrite: false }))
  s.scale.set(r * 2, r * 2, 1)
  return s
}

/**
 * 知识群可视化 — three deliberate departures from Obsidian's hairball:
 *
 *  1. SEMANTIC ZOOM. We render one level at a time (副脑 -> 簇 -> 碎片) and drill
 *     on click. The full graph is never on screen, so it is never a fur ball.
 *  2. PINNED COORDINATES. Positions come from the server (PCA of the embeddings)
 *     and we set fx/fy/fz, so the simulation cannot move them. The same note is
 *     in the same place every launch — that is what makes the map memorable
 *     and therefore actually usable for retrieval.
 *  3. ACTIVATION, NOT DECORATION. When a spark lands or an agent cites a
 *     fragment, only the hit nodes stay lit; everything else drops to 8%.
 *     The graph is a stage, not wallpaper.
 */

interface Props {
  activeIds: string[]                 // chunk ids to spotlight
  onPickChunk?: (id: string) => void
  refreshKey?: number
  theme?: 'light' | 'dark'
}

interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, onPickChunk, refreshKey = 0, theme = 'dark' }: Props) {
  const dark = theme === 'dark'
  const bg = 'rgba(0,0,0,0)'          // paper + dot grid come from CSS behind the canvas
  const labelLit = dark ? '#EDECE6' : '#242321'
  const labelDim = dark ? '#7A7973' : '#96958E'
  const labelShadow = dark ? 'rgba(28,28,27,0.95)' : 'rgba(250,250,247,0.95)'
  // two inks only: every brain is a density of the same cobalt plate
  const INKS = dark ? ['#7D96E4', '#5D74BF', '#3E4E80'] : ['#2148B8', '#6F87D1', '#A8B6E3']
  const dimInk = dark ? '#2A2A29' : '#E4E4DF'
  const inkOf = (n: any) => INKS[(brainIndex.get(n.brain_id) ?? 0) % INKS.length]
  const fgRef = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ level: 'brain', label: '全部副脑' }])
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>(
    { nodes: [], links: [] })
  const [hover, setHover] = useState<GraphNode | null>(null)
  const [total, setTotal] = useState(0)
  const [brainIndex, setBrainIndex] = useState<Map<string, number>>(new Map())
  const [, setFontsReady] = useState(false)   // labels are canvas-drawn: rebuild once the serif arrives
  useEffect(() => {
    document.fonts?.load('700 48px "IBM Plex Serif"').then(() => setFontsReady(true)).catch(() => {})
  }, [])
  useEffect(() => {
    api.brains().then(bs => setBrainIndex(new Map(bs.map((b, i) => [b.id, i])))).catch(() => {})
  }, [refreshKey])

  const here = crumbs[crumbs.length - 1]

  // react-force-graph-3d does not size itself to its parent; without an explicit
  // width/height the canvas renders at 0×0 (invisible). Track the container.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    const brainId = crumbs.find(c => c.level === 'cluster')?.id
    const clusterId = crumbs.find(c => c.level === 'chunk')?.id
    api.graph(here.level, here.level === 'brain' ? undefined : brainId, clusterId)
      .then(r => {
        if (!alive) return
        setTotal(r.total_chunks)
        // pin every node: the whole point of precomputed layout
        setData({
          nodes: r.nodes.map(n => ({ ...n, fx: n.x, fy: n.y, fz: n.z })),
          links: r.links,
        })
        // Frame the whole cloud from a fixed distance centered on the origin.
        // A fixed distance (rather than zoomToFit) keeps every node in view as
        // the map slowly auto-rotates; the layout lives in a ~±250 box.
        if (r.nodes.length) setTimeout(() => {
          const span = Math.max(220, ...r.nodes.flatMap(n =>
            [Math.abs(n.x || 0), Math.abs(n.y || 0), Math.abs(n.z || 0)]))
          fgRef.current?.cameraPosition({ x: 0, y: 0, z: span * 2.7 }, { x: 0, y: 0, z: 0 }, 600)
        }, 120)
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, refreshKey])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  // only spotlight when the current zoom level actually holds a hit, so a
  // chunk-level spotlight doesn't fade the whole brain-level map to grey.
  const dimming = active.size > 0 && data.nodes.some(n => active.has(n.id))

  // gentle idle rotation gives the map life; pause it while hits are spotlighted
  // so the camera fly-to isn't fought by the orbit.
  useEffect(() => {
    const c = fgRef.current?.controls?.()
    if (!c) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    c.autoRotate = !dimming && !still
    c.autoRotateSpeed = 0.45
  }, [dimming, data.nodes])

  // fly the camera to the centroid of the活跃 nodes when a spark lands
  useEffect(() => {
    if (!dimming || !fgRef.current) return
    const hits = data.nodes.filter(n => active.has(n.id))
    if (!hits.length) return
    const c = hits.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }),
                          { x: 0, y: 0, z: 0 })
    const n = hits.length
    fgRef.current.cameraPosition(
      { x: c.x / n, y: c.y / n, z: c.z / n + 420 },
      { x: c.x / n, y: c.y / n, z: c.z / n }, 900)
  }, [activeIds, data.nodes, dimming])

  const drill = (n: GraphNode) => {
    if (n.level === 'brain') setCrumbs([...crumbs, { level: 'cluster', id: n.id, label: n.label }])
    else if (n.level === 'cluster') setCrumbs([...crumbs, { level: 'chunk', id: n.id, label: n.label }])
    else onPickChunk?.(n.id)
  }

  return (
    <div className="galaxy" ref={wrapRef}>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <button key={i} onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
                  className={i === crumbs.length - 1 ? 'crumb active' : 'crumb'}>
            {c.label}
          </button>
        ))}
        <span className="crumb-meta">
          {here.level === 'brain'
            ? `${data.nodes.length} 个副脑 · 共 ${total} 条碎片`
            : here.level === 'cluster'
            ? `${data.nodes.length} 个主题 · 共 ${total} 条碎片`
            : `${data.nodes.length} / ${total} 条碎片`}
        </span>
      </div>

      <ForceGraph3D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data as any}
        backgroundColor={bg}
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(n: any) => `<div class="tip"><b>${n.label}</b><br/>${n.preview ?? ''}</div>`}
        nodeRelSize={9}
        nodeVal={(n: any) => (active.has(n.id) ? n.size * 3 : n.size)}
        nodeColor={(n: any) => (!dimming || active.has(n.id) ? inkOf(n) : dimInk)}
        nodeOpacity={0.95}
        nodeResolution={16}
        nodeThreeObject={(n: any) => {
          const lit = !dimming || active.has(n.id)
          const r = Math.sqrt(active.has(n.id) ? n.size * 3 : n.size) * 9
          const g = new THREE.Group()
          g.add(makeDisc(lit ? inkOf(n) : dimInk, r))
          if (n.level !== 'chunk') {
            const s = makeLabel(n.label, lit ? labelLit : labelDim, !lit, labelShadow)
            s.position.set(0, r + 14, 0)
            g.add(s)
          }
          return g
        }}
        linkColor={(l: any) => (l.kind === 'hit' ? INKS[0] : dimInk)}
        linkWidth={(l: any) => (l.kind === 'hit' ? 1.4 : 0.3)}
        linkDirectionalParticles={(l: any) => (l.kind === 'hit' ? 4 : 0)}
        linkDirectionalParticleWidth={2.4}
        linkDirectionalParticleSpeed={0.012}
        enableNodeDrag={false}
        onNodeClick={drill as any}
        onNodeHover={(n: any) => setHover(n || null)}
      />

      {hover && (
        <div className="inspector">
          <div className="ins-title">{hover.label}</div>
          <div className="ins-body">{hover.preview}</div>
          {hover.source_path && <div className="ins-src">{hover.source_path}</div>}
        </div>
      )}
    </div>
  )
}
