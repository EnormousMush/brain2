import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'

/* ------------------------------------------------------------------ inks
   Two inks only. Paper is the substrate; cobalt is the chromatic plate and
   every brain is a density of it. Carbon appears only in labels. */
const INK = {
  light: { paper: '#FAFAF7', label: '#242321', labelDim: '#96958E', shadow: 'rgba(250,250,247,0.95)',
           plates: ['#2148B8', '#6F87D1', '#A8B6E3'], dim: '#E4E4DF', hair: '#C9CFE6', dust: '#A8B6E3' },
  dark:  { paper: '#1C1C1B', label: '#EDECE6', labelDim: '#7A7973', shadow: 'rgba(28,28,27,0.95)',
           plates: ['#7D96E4', '#5D74BF', '#3E4E80'], dim: '#2A2A29', hair: '#3A4360', dust: '#3E4E80' },
}

/* ------------------------------------------------------------ textures */
const TEX = new Map<string, THREE.Texture>()
function canvasTex(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  let t = TEX.get(key)
  if (t) return t
  const c = document.createElement('canvas'); c.width = c.height = size
  draw(c.getContext('2d')!, size)
  t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter
  TEX.set(key, t)
  return t
}
const discTex = (color: string) => canvasTex(`disc:${color}`, 64, (ctx, s) => {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); ctx.fill()
})
const ringTex = (color: string) => canvasTex(`ring:${color}`, 128, (ctx, s) => {
  ctx.strokeStyle = color; ctx.lineWidth = 5
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.16, 0, Math.PI * 2); ctx.fill()
})
/** Ink bleed: a soft halo behind an activated node, like wet ink on paper. */
const haloTex = (color: string) => canvasTex(`halo:${color}`, 128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, color); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.28; ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
})

function sprite(tex: THREE.Texture, size: number, opacity = 1): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity }))
  s.scale.set(size, size, 1)
  return s
}

/** A crisp always-on text label as a camera-facing sprite. */
function makeLabel(text: string, color: string, dim: boolean, shadow: string): THREE.Sprite {
  const fs = 48, pad = 10
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const measure = document.createElement('canvas').getContext('2d')!
  const font = `700 ${fs}px "Helvetica Neue", "PingFang SC", -apple-system, sans-serif`
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
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  s.scale.set(w * 0.34, h * 0.34, 1)
  return s
}

/* ------------------------------------------------------------ chart layer
   Everything that is not a node: orbit rings around each brain, a field of
   paper dust for depth, and the constellation drawn between hits. Rebuilt
   from scratch whenever the data or the spotlight changes. */
function circle(r: number, color: string, opacity: number, segments = 96): THREE.LineLoop {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0))
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts)
  return new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }))
}

function armillary(r: number, color: string, opacity: number): THREE.Group {
  const g = new THREE.Group()
  const a = circle(r, color, opacity)
  const b = circle(r, color, opacity); b.rotation.x = Math.PI / 2
  const c = circle(r * 0.62, color, opacity * 0.7); c.rotation.y = Math.PI / 2
  g.add(a, b, c)
  return g
}

function dust(count: number, radius: number, color: string): THREE.Points {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // uniform in a sphere, biased outward so the middle stays quiet
    const u = Math.random(), v = Math.random()
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1)
    const r = radius * Math.cbrt(0.35 + 0.65 * Math.random())
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
    pos[i * 3 + 2] = r * Math.cos(ph)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size: 1.6, sizeAttenuation: true,
                                                        transparent: true, opacity: 0.55, depthWrite: false }))
}

/* ------------------------------------------------------------------ view */
interface Props {
  activeIds: string[]                 // chunk ids to spotlight
  onPickChunk?: (id: string) => void
  refreshKey?: number
  theme?: 'light' | 'dark'
}
interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, onPickChunk, refreshKey = 0, theme = 'dark' }: Props) {
  const ink = INK[theme === 'dark' ? 'dark' : 'light']
  const fgRef = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<THREE.Group | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ level: 'brain', label: '全部副脑' }])
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [hover, setHover] = useState<GraphNode | null>(null)
  const [total, setTotal] = useState(0)
  const [brainIndex, setBrainIndex] = useState<Map<string, number>>(new Map())
  const [span, setSpan] = useState(260)
  // the hit fragments themselves, with real coordinates, so the top level can
  // show them as lit stars inside their brain's orbit
  const [hitNodes, setHitNodes] = useState<GraphNode[]>([])

  useEffect(() => {
    api.brains().then(bs => setBrainIndex(new Map(bs.map((b, i) => [b.id, i])))).catch(() => {})
  }, [refreshKey])

  const here = crumbs[crumbs.length - 1]
  const plateOf = (n: any) => ink.plates[(brainIndex.get(n.brain_id) ?? 0) % ink.plates.length]

  // react-force-graph-3d does not size itself to its parent; track the container.
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
        setData({ nodes: r.nodes.map(n => ({ ...n, fx: n.x, fy: n.y, fz: n.z })), links: r.links })
        const s = Math.max(220, ...r.nodes.flatMap(n => [Math.abs(n.x || 0), Math.abs(n.y || 0), Math.abs(n.z || 0)]))
        setSpan(s)
        if (r.nodes.length) setTimeout(() => {
          fgRef.current?.cameraPosition({ x: 0, y: 0, z: s * 2.7 }, { x: 0, y: 0, z: 0 }, 600)
        }, 120)
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, refreshKey])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  useEffect(() => {
    if (!activeIds.length) { setHitNodes([]); return }
    let alive = true
    api.graph('chunk').then(r => { if (alive) setHitNodes(r.nodes.filter(n => active.has(n.id))) })
      .catch(() => {})
    return () => { alive = false }
  }, [activeIds, refreshKey])
  const hitBrains = useMemo(() => new Set(hitNodes.map(n => n.brain_id)), [hitNodes])
  const hits = useMemo(() =>
    here.level === 'brain' ? hitNodes : data.nodes.filter(n => active.has(n.id)),
    [here.level, hitNodes, data.nodes, active])
  const dimming = active.size > 0 && hits.length > 0
  const isLit = (n: any) => !dimming || active.has(n.id) || (n.level === 'brain' && hitBrains.has(n.id))

  // depth: fog to the paper colour so far stars fade like ink thinning out
  useEffect(() => {
    const scene: THREE.Scene | undefined = fgRef.current?.scene?.()
    if (!scene) return
    scene.fog = new THREE.Fog(ink.paper, span * 2.0, span * 4.6)
  }, [span, ink.paper, data.nodes])

  // the chart layer: rings, dust, constellation
  useEffect(() => {
    const scene: THREE.Scene | undefined = fgRef.current?.scene?.()
    if (!scene) return
    if (chartRef.current) { scene.remove(chartRef.current); chartRef.current = null }
    const g = new THREE.Group()

    // paper dust for volume; sparse so the page still reads as paper
    g.add(dust(here.level === 'chunk' ? 260 : 420, span * 1.9, ink.dust))

    // one orbit system per brain at the top level; one enclosing ring below it
    if (here.level === 'brain') {
      for (const n of data.nodes) {
        const lit = isLit(n)
        const a = armillary(Math.max(36, n.size * 9), lit ? plateOf(n) : ink.dim, lit ? 0.35 : 0.15)
        a.position.set(n.x, n.y, n.z)
        a.rotation.set(0.4 + (brainIndex.get(n.brain_id) ?? 0) * 0.7, 0.3, 0)
        g.add(a)
      }
    } else if (data.nodes.length) {
      const c = data.nodes.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y, z: acc.z + n.z }), { x: 0, y: 0, z: 0 })
      const cx = c.x / data.nodes.length, cy = c.y / data.nodes.length, cz = c.z / data.nodes.length
      const r = Math.max(60, ...data.nodes.map(n => Math.hypot(n.x - cx, n.y - cy, n.z - cz))) + 18
      const a = armillary(r, ink.hair, 0.5)
      a.position.set(cx, cy, cz)
      g.add(a)
    }

    // at the top level the hit fragments appear as stars inside their orbits
    if (here.level === 'brain') {
      for (const n of hits) {
        const st = sprite(discTex(plateOf(n)), 9)
        st.position.set(n.x, n.y, n.z)
        g.add(st)
      }
    }

    // constellation: the hits joined into one figure, cobalt hairline, dashed
    if (hits.length >= 2) {
      const c = hits.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y, z: acc.z + n.z }), { x: 0, y: 0, z: 0 })
      const centre = new THREE.Vector3(c.x / hits.length, c.y / hits.length, c.z / hits.length)
      const ordered = [...hits].sort((p, q) =>
        Math.atan2(p.y - centre.y, p.x - centre.x) - Math.atan2(q.y - centre.y, q.x - centre.x))
      const pts = ordered.map(n => new THREE.Vector3(n.x, n.y, n.z))
      pts.push(pts[0].clone())
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: ink.plates[0], dashSize: 6, gapSize: 4,
                                                                      transparent: true, opacity: 0.9, depthWrite: false }))
      line.computeLineDistances()
      g.add(line)
      // ink bleed behind each hit
      for (const n of hits) {
        const h = sprite(haloTex(plateOf(n)), Math.sqrt(n.size * 3) * 9 * 4.2)
        h.position.set(n.x, n.y, n.z)
        g.add(h)
      }
    }

    scene.add(g)
    chartRef.current = g
    return () => { scene.remove(g) }
  }, [data, hits, dimming, here.level, span, ink, brainIndex, hitBrains])

  // gentle idle rotation; pause it while hits are spotlighted so the fly-to isn't fought
  useEffect(() => {
    const c = fgRef.current?.controls?.()
    if (!c) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    c.autoRotate = !dimming && !still
    c.autoRotateSpeed = 0.45
    c.enableDamping = true
    c.dampingFactor = 0.08
  }, [dimming, data.nodes])

  // fly the camera to the centroid of the active nodes when a spark lands
  useEffect(() => {
    if (!dimming || !fgRef.current) return
    if (!hits.length) return
    const c = hits.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }), { x: 0, y: 0, z: 0 })
    const n = hits.length
    const spread = Math.max(160, ...hits.map(h => Math.hypot(h.x - c.x / n, h.y - c.y / n, h.z - c.z / n))) * 2.6
    fgRef.current.cameraPosition(
      { x: c.x / n, y: c.y / n, z: c.z / n + spread },
      { x: c.x / n, y: c.y / n, z: c.z / n }, 1100)
  }, [hits, dimming])

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
        backgroundColor={ink.paper}
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(n: any) => `<div class="tip"><b>${n.label}</b><br/>${n.preview ?? ''}</div>`}
        nodeRelSize={9}
        nodeVal={(n: any) => (active.has(n.id) ? n.size * 3 : n.size)}
        nodeThreeObject={(n: any) => {
          const lit = isLit(n)
          const r = Math.sqrt(active.has(n.id) ? n.size * 3 : n.size) * 9
          const color = lit ? plateOf(n) : ink.dim
          const g = new THREE.Group()
          // brain = ring with a core, cluster = disc, chunk = small star
          if (n.level === 'brain') g.add(sprite(ringTex(color), r * 2))
          else if (n.level === 'cluster') g.add(sprite(discTex(color), r * 2))
          else g.add(sprite(discTex(color), Math.max(r * 2, 7)))
          if (n.level !== 'chunk') {
            const s = makeLabel(n.label, lit ? ink.label : ink.labelDim, !lit, ink.shadow)
            s.position.set(0, r + 14, 0)
            g.add(s)
          }
          return g
        }}
        linkColor={(l: any) => (l.kind === 'hit' ? ink.plates[0] : ink.hair)}
        linkWidth={(l: any) => (l.kind === 'hit' ? 1.4 : 0.4)}
        linkOpacity={0.5}
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
