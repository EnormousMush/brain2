import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'

/* ------------------------------------------------------------------ hues
   Each brain owns one hue. Dark = saturated light on a near-black canvas
   (additive glow); light = the same hues desaturated, normal blending. */
const THEME = {
  dark: {
    paper: '#0A1017', label: '#F2F3F5', labelDim: '#5E6B7A', shadow: 'rgba(10,16,23,0.95)',
    hues: ['#A855F7', '#F0468C', '#38BDF8', '#FBBF24', '#34D399'],
    core: '#7DF9FF', dim: '#1E2129', wire: '#FFFFFF', axis: '#6B7683', additive: true,
    cloudOpacity: 0.42, cloudSize: 5.2,
  },
  light: {
    paper: '#FAFAF7', label: '#111418', labelDim: '#8A939E', shadow: 'rgba(250,250,247,0.95)',
    hues: ['#8B7CC8', '#C97B9E', '#6FA8C9', '#C9A66F', '#6FB59A'],
    core: '#2148B8', dim: '#DFE2E8', wire: '#111418', axis: '#8A939E', additive: false,
    cloudOpacity: 0.32, cloudSize: 4.2,
  },
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
/** soft white dot: the particle of every cloud (tinted by material colour) */
const softDot = () => canvasTex('soft', 64, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
})
/** glowing core */
const coreTex = (color: string) => canvasTex(`core:${color}`, 128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.18, color); g.addColorStop(0.45, color + '55'); g.addColorStop(1, color + '00')
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
})
/** glass disc: translucent fill, bright rim, a highlight arc top-left */
const glassTex = (rim: string) => canvasTex(`glass:${rim}`, 256, (ctx, s) => {
  const c = s / 2, r = s / 2 - 6
  const fill = ctx.createRadialGradient(c - r * .35, c - r * .35, r * .1, c, c, r)
  fill.addColorStop(0, 'rgba(255,255,255,.28)'); fill.addColorStop(.6, 'rgba(255,255,255,.08)'); fill.addColorStop(1, 'rgba(255,255,255,.14)')
  ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 3; ctx.strokeStyle = rim; ctx.globalAlpha = .9
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = .7; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(c, c, r - 9, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke()
})

function sprite(tex: THREE.Texture, size: number, opacity = 1, additive = false): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity,
                                       blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
  const s = new THREE.Sprite(m)
  s.scale.set(size, size, 1)
  return s
}

function makeLabel(text: string, color: string, dim: boolean, shadow: string, fs = 48, weight = 700): THREE.Sprite {
  const pad = 10
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const measure = document.createElement('canvas').getContext('2d')!
  const font = `${weight} ${fs}px "Helvetica Neue", "PingFang SC", -apple-system, sans-serif`
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width) + pad * 2
  const h = fs + pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr; canvas.height = h * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr); ctx.font = font; ctx.textBaseline = 'middle'
  ctx.shadowColor = shadow; ctx.shadowBlur = 7
  ctx.fillStyle = color; ctx.globalAlpha = dim ? 0.3 : 1
  ctx.fillText(text, pad, h / 2)
  const tex = new THREE.CanvasTexture(canvas); tex.minFilter = THREE.LinearFilter
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  s.scale.set(w * 0.34, h * 0.34, 1)
  return s
}

/* --------------------------------------------------------------- clouds */
function gauss() { // Box–Muller
  const u = 1 - Math.random(), v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
/** A nebula seeded by real fragment coordinates: every chunk sprinkles a
 *  handful of particles around itself, so the cloud's shape is the data. */
function cloud(seeds: GraphNode[], perSeed: number, sigma: number, color: string, size: number,
               opacity: number, additive: boolean): THREE.Points {
  const n = seeds.length * perSeed
  const pos = new Float32Array(n * 3)
  let i = 0
  for (const s of seeds) {
    for (let k = 0; k < perSeed; k++) {
      pos[i++] = s.x + gauss() * sigma
      pos[i++] = s.y + gauss() * sigma
      pos[i++] = s.z + gauss() * sigma
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, opacity, depthWrite: false,
                                       sizeAttenuation: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
  return new THREE.Points(g, m)
}

function segments(pairs: [THREE.Vector3, THREE.Vector3][], color: string, opacity: number, additive: boolean): THREE.LineSegments {
  const pos = new Float32Array(pairs.length * 6)
  pairs.forEach(([a, b], i) => { pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6) })
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }))
}

/** A corner axis tripod with labels, like a plotted chart. */
function axes(span: number, color: string, labelColor: string, shadow: string): THREE.Group {
  const g = new THREE.Group()
  const o = new THREE.Vector3(-span, -span, -span)
  const L = span * 2
  const dirs: [THREE.Vector3, string][] = [
    [new THREE.Vector3(L, 0, 0), 'X · AXIS'], [new THREE.Vector3(0, L, 0), 'Z · AXIS'], [new THREE.Vector3(0, 0, L), 'Y · AXIS'],
  ]
  for (const [d, name] of dirs) {
    const end = o.clone().add(d)
    g.add(segments([[o, end]], color, 0.55, false))
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8 }))
    cone.position.copy(end)
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
    g.add(cone)
    const lbl = makeLabel(name, labelColor, false, shadow, 30, 500)
    lbl.position.copy(o.clone().add(d.clone().multiplyScalar(0.5))).add(new THREE.Vector3(0, -18, 0))
    g.add(lbl)
  }
  return g
}

/* ------------------------------------------------------------------ view */
interface Props {
  activeIds: string[]
  onPickChunk?: (id: string) => void
  refreshKey?: number
  theme?: 'light' | 'dark'
}
interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, onPickChunk, refreshKey = 0, theme = 'dark' }: Props) {
  const dark = theme === 'dark'
  const T = THEME[dark ? 'dark' : 'light']
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
  const [allChunks, setAllChunks] = useState<GraphNode[]>([])   // seeds for the nebulae

  useEffect(() => {
    api.brains().then(bs => setBrainIndex(new Map(bs.map((b, i) => [b.id, i])))).catch(() => {})
    api.graph('chunk').then(r => setAllChunks(r.nodes)).catch(() => {})
  }, [refreshKey])

  const here = crumbs[crumbs.length - 1]
  const hueOf = (brainId: string) => T.hues[(brainIndex.get(brainId) ?? 0) % T.hues.length]

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
          fgRef.current?.cameraPosition({ x: s * 0.9, y: s * 0.6, z: s * 2.4 }, { x: 0, y: 0, z: 0 }, 600)
        }, 120)
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, refreshKey])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  const hitNodes = useMemo(() => allChunks.filter(n => active.has(n.id)), [allChunks, active])
  const hitBrains = useMemo(() => new Set(hitNodes.map(n => n.brain_id)), [hitNodes])
  const hits = useMemo(() =>
    here.level === 'brain' ? hitNodes : data.nodes.filter(n => active.has(n.id)),
    [here.level, hitNodes, data.nodes, active])
  const dimming = active.size > 0 && hits.length > 0
  const isLit = (n: any) => !dimming || active.has(n.id) || (n.level === 'brain' && hitBrains.has(n.id))

  // depth: fog to the canvas colour
  useEffect(() => {
    const scene: THREE.Scene | undefined = fgRef.current?.scene?.()
    if (!scene) return
    scene.fog = new THREE.Fog(T.paper, span * 2.2, span * 5.2)
  }, [span, T.paper, data.nodes])

  // the chart layer: nebulae, wires, axes, constellation
  useEffect(() => {
    const scene: THREE.Scene | undefined = fgRef.current?.scene?.()
    if (!scene) return
    if (chartRef.current) { scene.remove(chartRef.current); chartRef.current = null }
    const g = new THREE.Group()

    // which fragments seed the clouds at this level
    const visibleBrain = crumbs.find(c => c.level === 'cluster')?.id
    const visibleCluster = crumbs.find(c => c.level === 'chunk')?.id
    const seeds = allChunks.filter(c =>
      (!visibleBrain || c.brain_id === visibleBrain) && (!visibleCluster || (c as any).cluster_id === visibleCluster))
    const byBrain = new Map<string, GraphNode[]>()
    for (const c of seeds) byBrain.set(c.brain_id, [...(byBrain.get(c.brain_id) || []), c])

    // nebulae: ~900 particles per brain, spread by how many fragments it has
    for (const [bid, list] of byBrain) {
      const lit = !dimming || hitBrains.has(bid)
      const perSeed = Math.min(600, Math.max(60, Math.round(2400 / list.length)))
      const sigma = here.level === 'brain' ? 34 : 16
      const hue = lit ? hueOf(bid) : T.dim
      // outer haze, mid body, dense core: three shells of the same hue
      g.add(cloud(list, perSeed, sigma * 1.6, hue, T.cloudSize * 1.3, (lit ? T.cloudOpacity : 0.08) * 0.45, T.additive))
      g.add(cloud(list, perSeed, sigma, hue, T.cloudSize, lit ? T.cloudOpacity : 0.1, T.additive))
      g.add(cloud(list, Math.ceil(perSeed / 2), sigma * 0.4, hue, T.cloudSize * 0.7, lit ? T.cloudOpacity * 1.3 : 0.1, T.additive))
    }

    // wires: hub ↔ hub, and each hub to a few stray particles of other clouds
    const hubs = data.nodes.filter(n => n.level !== 'chunk')
    const pairs: [THREE.Vector3, THREE.Vector3][] = []
    for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++)
      pairs.push([new THREE.Vector3(hubs[i].x, hubs[i].y, hubs[i].z), new THREE.Vector3(hubs[j].x, hubs[j].y, hubs[j].z)])
    for (const h of hubs) {
      const others = seeds.filter(c => c.brain_id !== h.brain_id)
      for (let k = 0; k < Math.min(10, others.length); k++) {
        const c = others[Math.floor(Math.random() * others.length)]
        pairs.push([new THREE.Vector3(h.x, h.y, h.z), new THREE.Vector3(c.x + gauss() * 10, c.y + gauss() * 10, c.z + gauss() * 10)])
      }
    }
    if (pairs.length) g.add(segments(pairs, T.wire, dark ? 0.16 : 0.12, false))

    // axes in the corner
    g.add(axes(span * 1.15, T.axis, T.axis, T.shadow))

    // hit fragments as bright stars at the top level, plus the constellation
    if (here.level === 'brain') {
      for (const n of hits) {
        const st = sprite(coreTex(hueOf(n.brain_id)), 26, 1, T.additive)
        st.position.set(n.x, n.y, n.z)
        g.add(st)
      }
    }
    if (hits.length >= 2) {
      const c = hits.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y, z: acc.z + n.z }), { x: 0, y: 0, z: 0 })
      const centre = new THREE.Vector3(c.x / hits.length, c.y / hits.length, c.z / hits.length)
      const ordered = [...hits].sort((p, q) =>
        Math.atan2(p.y - centre.y, p.x - centre.x) - Math.atan2(q.y - centre.y, q.x - centre.x))
      const pts = ordered.map(n => new THREE.Vector3(n.x, n.y, n.z)); pts.push(pts[0].clone())
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: T.core, dashSize: 6, gapSize: 4, transparent: true, opacity: 0.95, depthWrite: false,
                                       blending: T.additive ? THREE.AdditiveBlending : THREE.NormalBlending }))
      line.computeLineDistances()
      g.add(line)
    }

    scene.add(g)
    chartRef.current = g
    return () => { scene.remove(g) }
  }, [data, hits, dimming, here.level, span, T, brainIndex, hitBrains, allChunks, crumbs])

  useEffect(() => {
    const c = fgRef.current?.controls?.()
    if (!c) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    c.autoRotate = !dimming && !still
    c.autoRotateSpeed = 0.4
    c.enableDamping = true
    c.dampingFactor = 0.08
  }, [dimming, data.nodes])

  useEffect(() => {
    if (!dimming || !fgRef.current || !hits.length) return
    const c = hits.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }), { x: 0, y: 0, z: 0 })
    const n = hits.length
    const spread = Math.max(180, ...hits.map(h => Math.hypot(h.x - c.x / n, h.y - c.y / n, h.z - c.z / n))) * 2.6
    fgRef.current.cameraPosition({ x: c.x / n + spread * 0.25, y: c.y / n + spread * 0.15, z: c.z / n + spread },
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
        backgroundColor={T.paper}
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(n: any) => `<div class="tip"><b>${n.label}</b><br/>${n.preview ?? ''}</div>`}
        nodeRelSize={9}
        nodeVal={(n: any) => (active.has(n.id) ? n.size * 3 : n.size)}
        nodeThreeObject={(n: any) => {
          const lit = isLit(n)
          const hue = lit ? hueOf(n.brain_id) : T.dim
          const r = Math.sqrt(active.has(n.id) ? n.size * 3 : n.size) * 9
          const g = new THREE.Group()
          if (n.level === 'brain') {
            // glass disc + glowing core: one circle per brain
            g.add(sprite(glassTex(hue), r * 3.2, lit ? 1 : 0.35))
            g.add(sprite(coreTex(T.core), r * 2.2, lit ? 1 : 0.2, T.additive))
          } else if (n.level === 'cluster') {
            g.add(sprite(glassTex(hue), r * 2, lit ? 0.9 : 0.3))
            g.add(sprite(coreTex(hue), r * 1.2, lit ? 0.9 : 0.2, T.additive))
          } else {
            g.add(sprite(coreTex(hue), Math.max(r * 2.2, 10), lit ? 1 : 0.25, T.additive))
          }
          if (n.level !== 'chunk') {
            const s = makeLabel(n.label, lit ? T.label : T.labelDim, !lit, T.shadow)
            s.position.set(0, r * 1.3 + 16, 0)
            g.add(s)
          }
          return g
        }}
        linkColor={() => T.wire}
        linkOpacity={dark ? 0.12 : 0.1}
        linkWidth={0.3}
        enableNodeDrag={false}
        onNodeClick={drill as any}
        onNodeHover={(n: any) => setHover(n || null)}
      />

      {hover && (
        <div className="panel inspector">
          <div className="ins-title">{hover.label}</div>
          <div className="ins-body">{hover.preview}</div>
          {hover.source_path && <div className="ins-src">{hover.source_path}</div>}
        </div>
      )}
    </div>
  )
}
