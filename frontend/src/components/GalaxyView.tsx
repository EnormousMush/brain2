import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'

/* ------------------------------------------------------------------ inks
   Two inks only. Paper is the substrate; cobalt is the chromatic plate and
   every brain is a density of it. Carbon appears only in labels.
   `idea` is the one exception — a warm second plate, because a thought you wrote
   yourself must never be mistaken for a fragment an agent can quote. */
const INK = {
  light: { paper: '#FAFAF7', label: '#242321', labelDim: '#96958E', shadow: 'rgba(250,250,247,0.95)',
           plates: ['#2148B8', '#6F87D1', '#A8B6E3'], dim: '#E4E4DF', hair: '#C9CFE6', dust: '#A8B6E3',
           idea: '#8A6A22' },
  dark:  { paper: '#0A1017', label: '#F2F3F5', labelDim: '#5E6B7A', shadow: 'rgba(10,16,23,0.95)',
           plates: ['#8AA4F0', '#5D74BF', '#3E4E80'], dim: '#1E2129', hair: '#243040', dust: '#3E4E80',
           idea: '#D6B36A' },
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
/** A想法: a four-pointed star, hollow-cored. Never a filled disc — that glyph is
 *  reserved for 碎片, the only thing an agent is allowed to cite. */
const starTex = (color: string) => canvasTex(`star:${color}`, 128, (ctx, s) => {
  const c = s / 2, R = s / 2 - 8, r = R * 0.3
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const rad = i % 2 === 0 ? R : r
    ctx[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * rad, c + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.stroke()
})
/** Ink bleed: a soft halo behind an activated node, like wet ink on paper. */
const haloTex = (color: string) => canvasTex(`halo:${color}`, 128, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, color); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.28; ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
})

function sprite(tex: THREE.Texture, size: number, opacity = 1, additive = false): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity,
                                                        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }))
  s.scale.set(size, size, 1)
  return s
}

/** A crisp always-on text label as a camera-facing sprite. */
function makeLabel(text: string, color: string, dim: boolean, shadow: string, k = 0.34): THREE.Sprite {
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
  s.scale.set(w * k, h * k, 1)
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
  onPickIdea?: (id: string) => void
  refreshKey?: number
  theme?: 'light' | 'dark'
}
interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, onPickChunk, onPickIdea, refreshKey = 0, theme = 'dark' }: Props) {
  const dark = theme === 'dark'
  const ink = INK[dark ? 'dark' : 'light']
  const fgRef = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<THREE.Group | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ level: 'brain', label: '全部副脑' }])
  // 顶层的两档：只看副脑（默认）/ 展开全部碎片。往下钻取时这个开关不参与。
  const [expand, setExpand] = useState(false)
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [hover, setHover] = useState<GraphNode | null>(null)
  const [total, setTotal] = useState(0)
  const [brains, setBrains] = useState<{ id: string; name: string }[]>([])
  const [span, setSpan] = useState(260)
  // the hit fragments themselves, with real coordinates, so the top level can
  // show them as lit stars inside their brain's orbit
  const [hitNodes, setHitNodes] = useState<GraphNode[]>([])

  useEffect(() => {
    api.brains().then(bs => setBrains(bs.map(b => ({ id: b.id, name: b.name })))).catch(() => {})
  }, [refreshKey])
  const brainIndex = useMemo(() => new Map(brains.map((b, i) => [b.id, i])), [brains])

  const here = crumbs[crumbs.length - 1]
  const top = crumbs.length === 1
  const level: Level = top && expand ? 'chunk' : here.level
  const allFragments = top && expand
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
    api.graph(level, level === 'brain' ? undefined : brainId, clusterId)
      .then(r => {
        if (!alive) return
        setTotal(r.total_chunks)
        setData({ nodes: r.nodes.map(n => ({ ...n, fx: n.x, fy: n.y, fz: n.z })), links: r.links })
        const s = Math.max(220, ...r.nodes.flatMap(n => [Math.abs(n.x || 0), Math.abs(n.y || 0), Math.abs(n.z || 0)]))
        setSpan(s)
        // Pull back far enough that the outermost galaxy clears the bottom
        // metadata band — a node on the Fibonacci sphere projects wider than
        // its raw coordinate once perspective is applied.
        if (r.nodes.length) setTimeout(() => {
          fgRef.current?.cameraPosition({ x: 0, y: 0, z: s * 3.4 }, { x: 0, y: 0, z: 0 }, 600)
        }, 120)
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, expand, refreshKey])

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
    level === 'brain' ? hitNodes : data.nodes.filter(n => active.has(n.id)),
    [level, hitNodes, data.nodes, active])
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
    g.add(dust(level === 'chunk' ? 260 : 420, span * 1.9, ink.dust))

    // one orbit system per brain at the top level; one enclosing ring below it
    if (level === 'brain') {
      for (const n of data.nodes) {
        const lit = isLit(n)
        const a = armillary(Math.max(36, n.size * 9), lit ? plateOf(n) : ink.dim, lit ? 0.35 : 0.15)
        a.position.set(n.x, n.y, n.z)
        a.rotation.set(0.4 + (brainIndex.get(n.brain_id) ?? 0) * 0.7, 0.3, 0)
        g.add(a)
      }
    } else if (allFragments) {
      // 展开的全部碎片：碎片自己没有名字，靠每个副脑的包络环 + 名牌来分区
      const groups = new Map<string, GraphNode[]>()
      for (const n of data.nodes) {
        if (n.level !== 'chunk') continue
        groups.set(n.brain_id, [...(groups.get(n.brain_id) ?? []), n])
      }
      for (const [bid, ns] of groups) {
        if (!bid) continue          // unfiled ideas have no brain to draw a ring for
        const c = ns.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }), { x: 0, y: 0, z: 0 })
        const cx = c.x / ns.length, cy = c.y / ns.length, cz = c.z / ns.length
        const r = Math.max(48, ...ns.map(n => Math.hypot(n.x - cx, n.y - cy, n.z - cz))) + 16
        const lit = !dimming || hitBrains.has(bid)
        const a = armillary(r, lit ? plateOf(ns[0]) : ink.dim, lit ? 0.22 : 0.1)
        a.position.set(cx, cy, cz)
        a.rotation.set(0.4 + (brainIndex.get(bid) ?? 0) * 0.7, 0.3, 0)
        g.add(a)
        const name = brains.find(b => b.id === bid)?.name
        if (name) {
          const s = makeLabel(name, lit ? ink.label : ink.labelDim, !lit, ink.shadow)
          s.position.set(cx, cy + r + 18, cz)
          g.add(s)
        }
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
    if (level === 'brain') {
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
                                                                      transparent: true, opacity: 0.9, depthWrite: false,
                                                                      blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending }))
      line.computeLineDistances()
      g.add(line)
      // ink bleed behind each hit
      for (const n of hits) {
        const h = sprite(haloTex(plateOf(n)), Math.sqrt(n.size * 3) * 9 * (dark ? 5 : 4.2), 1, dark)
        h.position.set(n.x, n.y, n.z)
        g.add(h)
      }
    }

    scene.add(g)
    chartRef.current = g
    return () => { scene.remove(g) }
  }, [data, hits, dimming, level, allFragments, brains, span, ink, brainIndex, hitBrains, dark])

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

  const cooccurCount = useMemo(() => data.links.filter(l => l.kind === 'cooccur').length, [data.links])
  const ideaCount = useMemo(() => data.nodes.filter(n => n.level === 'idea').length, [data.nodes])
  const mainCount = data.nodes.length - ideaCount
  const ideaMeta = ideaCount ? ` · ${ideaCount} 个想法` : ''  

  const drill = (n: GraphNode) => {
    if (n.level === 'brain') setCrumbs([...crumbs, { level: 'cluster', id: n.id, label: n.label }])
    else if (n.level === 'cluster') setCrumbs([...crumbs, { level: 'chunk', id: n.id, label: n.label }])
    else if (n.level === 'idea') onPickIdea?.(n.id)
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
        {top && (
          <div className="seg" role="group" aria-label="星图粒度">
            <button className={expand ? '' : 'on'} onClick={() => setExpand(false)}>副脑</button>
            <button className={expand ? 'on' : ''} onClick={() => setExpand(true)}>碎片</button>
          </div>
        )}
        <span className="crumb-meta">
          {allFragments
            ? `${mainCount} / ${total} 条碎片 · ${cooccurCount} 条辩论连线${ideaMeta}`
            : level === 'brain'
            ? `${mainCount} 个副脑 · 共 ${total} 条碎片${cooccurCount ? ` · ${cooccurCount} 条辩论连线` : ''}${ideaMeta}`
            : level === 'cluster'
            ? `${mainCount} 个主题 · 共 ${total} 条碎片${ideaMeta}`
            : `${mainCount} / ${total} 条碎片${ideaMeta}`}
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
          else if (n.level === 'idea') g.add(sprite(starTex(lit ? ink.idea : ink.dim), Math.max(r * 2.4, 15)))
          else g.add(sprite(discTex(color), Math.max(r * 2, 7)))
          if (n.level !== 'chunk') {
            const isIdea = n.level === 'idea'
            const s = makeLabel(n.label, isIdea ? (lit ? ink.idea : ink.labelDim)
                                                : (lit ? ink.label : ink.labelDim),
                                !lit, ink.shadow, isIdea ? 0.21 : 0.34)
            s.position.set(0, r + (isIdea ? 11 : 14), 0)
            g.add(s)
          }
          return g
        }}
        linkLabel={(l: any) => (l.kind === 'cooccur'
          ? `<div class="tip">同场辩论用过 · <b>${l.weight} 次</b></div>`
          : l.kind === 'seed' ? '<div class="tip">这个想法开出的辩论用到了它</div>' : '')}
        linkColor={(l: any) => (l.kind === 'seed' ? ink.idea
          : l.kind === 'contains' ? ink.hair : ink.plates[0])}
        // 共现边的粗细是场次的对数：接通一次是细线，反复接通才变成主干
        linkWidth={(l: any) => (l.kind === 'cooccur'
          ? Math.min(3.2, 0.7 + Math.log2(1 + (l.weight || 1)) * 1.1)
          : l.kind === 'hit' ? 1.4 : l.kind === 'seed' ? 0.7 : 0.4)}
        linkCurvature={(l: any) => (l.kind === 'cooccur' ? 0.14 : l.kind === 'seed' ? 0.28 : 0)}
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
