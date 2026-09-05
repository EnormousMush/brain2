import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { api } from '../api'
import type { GraphLink, GraphNode, Level } from '../types'

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
}

interface Crumb { level: Level; id?: string; label: string }

export default function GalaxyView({ activeIds, onPickChunk, refreshKey = 0 }: Props) {
  const fgRef = useRef<any>(null)
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ level: 'brain', label: '全部副脑' }])
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>(
    { nodes: [], links: [] })
  const [hover, setHover] = useState<GraphNode | null>(null)
  const [total, setTotal] = useState(0)

  const here = crumbs[crumbs.length - 1]

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
      })
      .catch(() => setData({ nodes: [], links: [] }))
    return () => { alive = false }
  }, [crumbs, refreshKey])

  const active = useMemo(() => new Set(activeIds), [activeIds])
  const dimming = active.size > 0

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
    <div className="galaxy">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <button key={i} onClick={() => setCrumbs(crumbs.slice(0, i + 1))}
                  className={i === crumbs.length - 1 ? 'crumb active' : 'crumb'}>
            {c.label}
          </button>
        ))}
        <span className="crumb-meta">
          {data.nodes.length} / {total} 碎片 · {here.level === 'brain' ? '副脑层'
            : here.level === 'cluster' ? '主题层' : '碎片层'}
        </span>
      </div>

      <ForceGraph3D
        ref={fgRef}
        graphData={data as any}
        backgroundColor="#0b0e14"
        nodeId="id"
        nodeLabel={(n: any) => `<div class="tip"><b>${n.label}</b><br/>${n.preview ?? ''}</div>`}
        nodeVal={(n: any) => (active.has(n.id) ? n.size * 2.4 : n.size)}
        nodeColor={(n: any) =>
          !dimming || active.has(n.id) ? n.color : 'rgba(120,130,150,0.08)'}
        nodeOpacity={0.92}
        nodeResolution={8}
        linkColor={(l: any) => (l.kind === 'hit' ? '#e0af68' : 'rgba(120,130,150,0.14)')}
        linkWidth={(l: any) => (l.kind === 'hit' ? 1.4 : 0.3)}
        linkDirectionalParticles={(l: any) => (l.kind === 'hit' ? 3 : 0)}
        linkDirectionalParticleWidth={2}
        enableNodeDrag={false}
        cooldownTicks={0}         /* positions are pinned; no simulation needed */
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
