import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'
import { Glass } from '../liquidGlass'

/* ------------------------------------------------------------------ hues
   Each brain owns one hue. Dark = saturated light on a near-black canvas
   (additive glow); light = the same hues desaturated, normal blending. */
const THEME = {
  dark: {
    paper: '#0A1017', label: '#F2F3F5', labelDim: '#5E6B7A', shadow: 'rgba(10,16,23,0.95)',
    hues: ['#A78BFA', '#F472B6', '#38BDF8', '#FBBF24', '#34D399', '#FB7185', '#60A5FA', '#F97316',
           '#2DD4BF', '#E879F9', '#A3E635', '#F59E0B', '#818CF8'],
    core: '#7DF9FF', dim: '#1E2129', wire: '#FFFFFF', additive: true, idea: '#D6B36A',
    cloudOpacity: 0.9, cloudSize: 5,
  },
  light: {
    paper: '#FAFAF7', label: '#111418', labelDim: '#8A939E', shadow: 'rgba(250,250,247,0.95)',
    hues: ['#8B7CC8', '#C97B9E', '#6FA8C9', '#C9A66F', '#6FB59A', '#C98486', '#7A93C9', '#C98E6A',
           '#6FB3AD', '#B784C4', '#9BB56F', '#C4A15F', '#8A8FC9'],
    core: '#2148B8', dim: '#DFE2E8', wire: '#111418', additive: false, idea: '#8A6A22',
    cloudOpacity: 0.8, cloudSize: 4,
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
/** 想法: a four-pointed hollow star. Never a filled disc — that glyph is reserved
 *  for 碎片, the only thing an agent is allowed to cite. */
const starTex = (color: string) => canvasTex(`star:${color}`, 128, (ctx, s) => {
  const c = s / 2, R = s / 2 - 8, r = R * 0.3
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const rad = i % 2 === 0 ? R : r
    ctx[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * rad, c + Math.sin(a) * rad)
  }
  ctx.closePath()
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.stroke()
})
/** plain disc, anti-aliased edge (clusters and stars) */
const discTex = (color: string) => canvasTex(`disc:${color}`, 128, (ctx, s) => {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2); ctx.fill()
})
function hash(str: string) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
/** a matte sphere: one soft highlight upper-left, a darkened limb, and a very
 *  fine grain. No surface features — the colour does the talking. */
const planetTex = (color: string) => canvasTex(`planet:${color}`, 256, (ctx, s) => {
  const c = s / 2, r = s / 2 - 4
  ctx.save(); ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = color; ctx.fillRect(0, 0, s, s)
  // limb darkening
  const limb = ctx.createRadialGradient(c, c, r * .55, c, c, r)
  limb.addColorStop(0, 'rgba(0,0,0,0)'); limb.addColorStop(1, 'rgba(0,0,0,.42)')
  ctx.fillStyle = limb; ctx.fillRect(0, 0, s, s)
  // soft highlight
  const hi = ctx.createRadialGradient(c - r * .42, c - r * .48, 0, c - r * .42, c - r * .48, r * .95)
  hi.addColorStop(0, 'rgba(255,255,255,.55)'); hi.addColorStop(.35, 'rgba(255,255,255,.14)'); hi.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = hi; ctx.fillRect(0, 0, s, s)
  // fine grain
  const img = ctx.getImageData(0, 0, s, s); const d = img.data
  let h = 1234567
  for (let i = 0; i < d.length; i += 4) { h = (h * 1664525 + 1013904223) >>> 0; const n = ((h >>> 24) / 255 - .5) * 10
    d[i] += n; d[i + 1] += n; d[i + 2] += n }
  ctx.putImageData(img, 0, 0)
  ctx.restore()
})

function sprite(tex: THREE.Texture, size: number, opacity = 1, additive = false): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity,
                                       blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
  const s = new THREE.Sprite(m)
  s.scale.set(size, size, 1)
  return s
}

function makeLabel(text: string, color: string, dim: boolean, shadow: string, fs = 40, weight = 600): THREE.Sprite {
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
  s.scale.set(w * 0.26, h * 0.26, 1)
  return s
}

/* --------------------------------------------------------------- clouds */
function gauss() { // Box–Muller
  const u = 1 - Math.random(), v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
/** Points scattered around seed coordinates (sigma 0 = the seeds themselves). */
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

/* ------------------------------------------------------------------ view */
interface Props {
  activeIds: string[]
  activeMode?: 'hits' | 'card'         // card = a replayed 想法卡片: draw the × between its fragments
  onPickChunk?: (id: string) => void
  onPickIdea?: (id: string) => void
  refreshKey?: number
  theme?: 'light' | 'dark'
}
interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, activeMode = 'hits', onPickChunk, onPickIdea, refreshKey = 0, theme = 'dark' }: Props) {
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
  const [brainNames, setBrainNames] = useState<Map<string, string>>(new Map())
  const [span, setSpan] = useState(260)
  const [allChunks, setAllChunks] = useState<GraphNode[]>([])
  const wobblers = useRef(new Map<string, THREE.Group>())   // brain id → inner group we drift

  useEffect(() => {
    api.brains().then(bs => {
      setBrainIndex(new Map(bs.map((b, i) => [b.id, i])))
      setBrainNames(new Map(bs.map(b => [b.id, b.name])))
    }).catch(() => {})
    api.graph('chunk').then(r => setAllChunks(r.nodes)).catch(() => {})
  }, [refreshKey])

  const [expand, setExpand] = useState(false)   // top level only: 副脑 (default) / 全部碎片
  const here = crumbs[crumbs.length - 1]
  const top = crumbs.length === 1
  const level: Level = top && expand ? 'chunk' : here.level
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
    api.graph(level, level === 'brain' ? undefined : brainId, clusterId)
      .then(r => {
        if (!alive) return
        setTotal(r.total_chunks)
        wobblers.current.clear()
        setData({ nodes: r.nodes.map(n => ({ ...n, fx: n.x, fy: n.y, fz: n.z })), links: r.links })
        const s = Math.max(220, ...r.nodes.flatMap(n => [Math.abs(n.x || 0), Math.abs(n.y || 0), Math.abs(n.z || 0)]))
        setSpan(s)
        if (r.nodes.length) setTimeout(() => {
          fgRef.current?.cameraPosition({ x: s * 0.9, y: s * 0.6, z: s * 2.4 }, { x: 0, y: 0, z: 0 }, 600)
        }, 120)
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, expand, refreshKey])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  const hitNodes = useMemo(() => allChunks.filter(n => active.has(n.id)), [allChunks, active])
  const hitBrains = useMemo(() => new Set(hitNodes.map(n => n.brain_id)), [hitNodes])
  const hits = useMemo(() =>
    level === 'brain' ? hitNodes : data.nodes.filter(n => active.has(n.id)),
    [level, hitNodes, data.nodes, active])
  const dimming = active.size > 0 && hits.length > 0
  const isLit = (n: any) => !dimming || active.has(n.id) || (n.level === 'brain' && hitBrains.has(n.id))

  // depth: fog to the canvas colour
  useEffect(() => {
    const scene: THREE.Scene | undefined = fgRef.current?.scene?.()
    if (!scene) return
    scene.fog = new THREE.Fog(T.paper, span * 3.2, span * 7.5)
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

    // the fragments themselves, as a sparse scatter at their real coordinates
    if (level === 'brain') {
      for (const [bid, list] of byBrain) {
        const lit = !dimming || hitBrains.has(bid)
        g.add(cloud(list, 1, 0, lit ? hueOf(bid) : T.dim, T.cloudSize, lit ? T.cloudOpacity : 0.12, T.additive))
      }
    }

    // expanded top level: fragments have no names, so label each brain's cloud
    if (top && expand) {
      const groups = new Map<string, GraphNode[]>()
      for (const n of data.nodes) if (n.level === 'chunk') groups.set(n.brain_id, [...(groups.get(n.brain_id) ?? []), n])
      for (const [bid, ns] of groups) {
        const c = ns.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }), { x: 0, y: 0, z: 0 })
        const lit = !dimming || hitBrains.has(bid)
        const name = brainNames.get(bid)
        if (!name) continue
        const s = makeLabel(name, lit ? T.label : T.labelDim, !lit, T.shadow)
        s.position.set(c.x / ns.length, c.y / ns.length + 40, c.z / ns.length)
        g.add(s)
      }
    }

    // wires: hub ↔ hub, and each hub to a few stray particles of other clouds
    const hubs = data.nodes.filter(n => n.level === 'brain' || n.level === 'cluster')
    // each hub joins its three nearest neighbours (all pairs turns into a web past ~8 brains)
    const pairs: [THREE.Vector3, THREE.Vector3][] = []
    const seen = new Set<string>()
    for (let i = 0; i < hubs.length; i++) {
      const near = hubs.map((h, j) => ({ j, d: Math.hypot(h.x - hubs[i].x, h.y - hubs[i].y, h.z - hubs[i].z) }))
        .filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
      for (const { j } of near) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (seen.has(key)) continue
        seen.add(key)
        pairs.push([new THREE.Vector3(hubs[i].x, hubs[i].y, hubs[i].z), new THREE.Vector3(hubs[j].x, hubs[j].y, hubs[j].z)])
      }
    }
    if (pairs.length) g.add(segments(pairs, T.wire, dark ? 0.1 : 0.08, false))

    // hit fragments as bright stars at the top level, plus the constellation
    if (level === 'brain') {
      for (const n of hits) {
        const st = sprite(coreTex(hueOf(n.brain_id)), 26, 1, T.additive)
        st.position.set(n.x, n.y, n.z)
        g.add(st)
      }
    }
    if (hits.length >= 2 && activeMode === 'card') {
      // the card's connection: every pair joined by a solid line, × at the midpoint
      for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
        const a = new THREE.Vector3(hits[i].x, hits[i].y, hits[i].z), b = new THREE.Vector3(hits[j].x, hits[j].y, hits[j].z)
        g.add(segments([[a, b]], T.core, 0.9, T.additive))
        const x = makeLabel('×', T.core, false, T.shadow, 56, 700)
        x.position.copy(a.clone().add(b).multiplyScalar(0.5))
        g.add(x)
      }
    } else if (hits.length >= 2) {
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
  }, [data, hits, dimming, level, span, T, brainIndex, hitBrains, allChunks, crumbs, activeMode])

  // the whole chart drifts slowly; any pointer interaction pauses it, and it
  // resumes a few seconds after the user lets go
  useEffect(() => {
    const c = fgRef.current?.controls?.()
    const el = wrapRef.current
    if ((import.meta as any).env?.DEV) (window as any).__fg = fgRef.current
    if (!c || !el) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    c.enableDamping = true
    c.dampingFactor = 0.08
    c.autoRotateSpeed = 0.35
    c.autoRotate = !still
    let timer: number | undefined
    // breathing: while idle the camera eases in and out by ±5% over ~24s,
    // measured from wherever the user left the zoom
    let base: number | null = null, phase = 0, raf = 0, lastT = performance.now()
    const cam = fgRef.current?.camera?.()
    const breathe = (t: number) => {
      raf = requestAnimationFrame(breathe)
      const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t
      if (!c.autoRotate || !cam || still) { base = null; return }
      const off = cam.position.clone().sub(c.target)
      const dist = off.length()
      if (base === null) { base = dist; phase = 0 }
      phase += (dt / 24) * Math.PI * 2
      const want = (base as number) * (1 + 0.05 * Math.sin(phase))
      cam.position.copy(c.target.clone().add(off.multiplyScalar(want / dist)))
    }
    raf = requestAnimationFrame(breathe)
    const pause = () => { c.autoRotate = false; base = null; window.clearTimeout(timer) }
    const resume = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { c.autoRotate = !still }, 3500) }
    const onDown = () => pause()
    const onUp = () => resume()
    const onWheel = () => { pause(); resume() }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [data.nodes])

  useEffect(() => {
    if (!dimming || !fgRef.current || !hits.length) return
    const c = hits.reduce((a, n) => ({ x: a.x + n.x, y: a.y + n.y, z: a.z + n.z }), { x: 0, y: 0, z: 0 })
    const n = hits.length
    const spread = Math.max(180, ...hits.map(h => Math.hypot(h.x - c.x / n, h.y - c.y / n, h.z - c.z / n))) * 2.6
    const ctl = fgRef.current.controls?.()
    if (ctl) ctl.autoRotate = false
    fgRef.current.cameraPosition({ x: c.x / n + spread * 0.25, y: c.y / n + spread * 0.15, z: c.z / n + spread },
                                 { x: c.x / n, y: c.y / n, z: c.z / n }, 1100)
    const t = window.setTimeout(() => { if (ctl && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ctl.autoRotate = true }, 3000)
    return () => window.clearTimeout(t)
  }, [hits, dimming])

  // each planet drifts on its own slow orbit: three sines with periods of
  // 9–19 s and phases from its id, a few units of amplitude
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still) return
    let raf = 0
    const params = new Map<string, number[]>()
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const T0 = t / 1000
      for (const [id, g] of wobblers.current) {
        let pr = params.get(id)
        if (!pr) {
          let h = hash(id); const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296 }
          pr = [9 + r() * 10, 9 + r() * 10, 9 + r() * 10, r() * 6.28, r() * 6.28, r() * 6.28, 3 + r() * 3]
          params.set(id, pr)
        }
        const [px, py, pz, ax, ay, az, amp] = pr
        g.position.set(Math.sin(T0 / px * 6.283 + ax) * amp, Math.sin(T0 / py * 6.283 + ay) * amp, Math.sin(T0 / pz * 6.283 + az) * amp * 0.6)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const drill = (n: GraphNode) => {
    if (n.level === 'idea') onPickIdea?.(n.id)
    else if (n.level === 'brain') setCrumbs([...crumbs, { level: 'cluster', id: n.id, label: n.label }])
    else if (n.level === 'cluster') setCrumbs([...crumbs, { level: 'chunk', id: n.id, label: n.label }])
    else onPickChunk?.(n.id)
  }

  return (
    <div className="galaxy" ref={wrapRef}>
      <Glass className="crumbs">
        {crumbs.map((c, i) => (
          <button key={i} onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
                  className={i === crumbs.length - 1 ? 'crumb active' : 'crumb'}>
            {c.label}
          </button>
        ))}
        {top && (
          <span className="seg">
            <button className={expand ? '' : 'on'} onClick={() => setExpand(false)}>副脑</button>
            <button className={expand ? 'on' : ''} onClick={() => setExpand(true)}>碎片</button>
          </span>
        )}
        <span className="crumb-meta">
          {level === 'brain'
            ? `${data.nodes.filter(n => n.level === 'brain').length} 个副脑 · 共 ${total} 条碎片`
            : level === 'cluster'
            ? `${data.nodes.filter(n => n.level === 'cluster').length} 个主题 · 共 ${total} 条碎片`
            : `${data.nodes.filter(n => n.level === 'chunk').length} / ${total} 条碎片`}
        </span>
      </Glass>

      <ForceGraph3D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data as any}
        backgroundColor={T.paper}
        controlType="orbit"
        showNavInfo={false}
        nodeId="id"
        nodeLabel={(n: any) => `<div class="tip"><b>${n.label}</b><br/>${n.preview ?? ''}</div>`}
        nodeRelSize={9}
        nodeVal={(n: any) => (n.level === 'brain' ? n.size * n.size * 0.08 : active.has(n.id) ? n.size * 3 : n.size)}
        nodeThreeObject={(n: any) => {
          const lit = isLit(n) || n.level === 'idea'
          const hue = lit ? (n.brain_id ? hueOf(n.brain_id) : T.idea) : T.dim
          const r = n.level === 'brain' ? n.size * 2.6 : Math.sqrt(active.has(n.id) ? n.size * 3 : n.size) * 9
          const g = new THREE.Group()
          if (n.level === 'brain') {
            // planet + halo live in an inner group so we can wobble them without
            // fighting the library, which owns the outer group's position
            const inner = new THREE.Group()
            inner.add(sprite(coreTex(hue), r * 4.2, lit ? 0.3 : 0.08, T.additive))
            inner.add(sprite(planetTex(hue), r * 2.1, lit ? 1 : 0.35))
            const s = makeLabel(n.label, lit ? T.label : T.labelDim, !lit, T.shadow)
            s.position.set(0, r * 1.15 + 12, 0)
            inner.add(s)
            g.add(inner)
            wobblers.current.set(n.id, inner)
            return g
          } else if (n.level === 'idea') {
            const ic = lit ? T.idea : T.dim
            g.add(sprite(starTex(ic), 22, lit ? 1 : 0.3))
            const s = makeLabel(n.label, lit ? ic : T.labelDim, !lit, T.shadow, 30, 500)
            s.position.set(0, 20, 0)
            g.add(s)
          } else if (n.level === 'cluster') {
            g.add(sprite(discTex(hue), r * 1.6, lit ? 0.95 : 0.3))
          } else {
            g.add(sprite(coreTex(hue), Math.max(r * 2.2, 10), lit ? 1 : 0.25, T.additive))
          }
          if (n.level !== 'chunk') {
            const s = makeLabel(n.label, lit ? T.label : T.labelDim, !lit, T.shadow)
            s.position.set(0, r * 1.15 + 12, 0)
            g.add(s)
          }
          return g
        }}
        linkColor={(l: any) => (l.kind === 'cooccur' ? T.core : l.kind === 'seed' ? T.idea : T.wire)}
        linkOpacity={dark ? 0.35 : 0.3}
        linkWidth={(l: any) => (l.kind === 'cooccur' ? 0.6 + Math.min(3, l.weight) * 0.5 : l.kind === 'seed' ? 0.8 : 0.3)}
        linkDirectionalParticles={(l: any) => (l.kind === 'cooccur' ? 2 : 0)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.006}
        enableNodeDrag={false}
        onNodeClick={drill as any}
        onNodeHover={(n: any) => setHover(n || null)}
      />

      {hover && (
        <Glass className="panel inspector">
          <div className="ins-title">{hover.label}</div>
          <div className="ins-body">{hover.preview}</div>
          {hover.source_path && <div className="ins-src">{hover.source_path}</div>}
        </Glass>
      )}
    </div>
  )
}
