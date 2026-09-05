import type {
  Brain, Card, Debate, DebateConfig, GraphResponse, Level, SettingsView, Spark, Turn,
} from './types'

const J = { 'Content-Type': 'application/json' }

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.status === 204 ? (undefined as T) : r.json()
}

export const api = {
  health: () => req<{ ok: boolean; offline: boolean }>('/api/health'),

  // ---- brains
  brains: () => req<Brain[]>('/api/brains'),
  paste: (name: string, text: string) =>
    req('/api/brains/paste', { method: 'POST', headers: J, body: JSON.stringify({ name, text }) }),
  upload: (name: string, files: FileList) => {
    const fd = new FormData()
    fd.append('name', name)
    Array.from(files).forEach(f => fd.append('files', f))
    return req('/api/brains/upload', { method: 'POST', body: fd })
  },
  patchBrain: (id: string, patch: Partial<Brain>) =>
    req<Brain>(`/api/brains/${id}`, { method: 'PATCH', headers: J, body: JSON.stringify(patch) }),

  // ---- graph
  graph: (level: Level, brainId?: string, clusterId?: string) => {
    const q = new URLSearchParams({ level })
    if (brainId) q.set('brain_id', brainId)
    if (clusterId) q.set('cluster_id', clusterId)
    return req<GraphResponse>(`/api/graph?${q}`)
  },
  chunk: (id: string) => req<any>(`/api/graph/chunk/${id}`),

  // ---- sparks
  sparks: () => req<Spark[]>('/api/sparks'),
  spark: (id: string) => req<Spark>(`/api/sparks/${id}`),
  createSpark: (text: string) =>
    req<Spark>('/api/sparks', { method: 'POST', headers: J, body: JSON.stringify({ text }) }),
  rehit: (id: string, wildness: number) =>
    req<Spark>(`/api/sparks/${id}/rehit?wildness=${wildness}`, { method: 'POST' }),

  // ---- debates
  createDebate: (sparkId: string, config: Partial<DebateConfig>) =>
    req<Debate>('/api/debates', {
      method: 'POST', headers: J,
      body: JSON.stringify({ spark_id: sparkId, config }),
    }),
  turns: (id: string) => req<Turn[]>(`/api/debates/${id}/turns`),
  debateCards: (id: string) => req<Card[]>(`/api/debates/${id}/cards`),

  // ---- cards
  cards: () => req<Card[]>('/api/cards'),
  saveCard: (id: string, saved = true) =>
    req<Card>(`/api/cards/${id}/save?saved=${saved}`, { method: 'POST' }),

  // ---- settings / privacy
  settings: () => req<SettingsView>('/api/settings'),
  putSettings: (p: any) =>
    req<SettingsView>('/api/settings', { method: 'PUT', headers: J, body: JSON.stringify(p) }),
  privacy: () => req<{ storage: string; statements: string[] }>('/api/privacy'),
  wipe: () => req<{ ok: boolean }>('/api/privacy/all', { method: 'DELETE' }),
}

/** SSE. Returns a stop() — ALWAYS call it on unmount, or the debate keeps
 *  burning the user's tokens after they navigate away. */
export function streamDebate(
  debateId: string,
  on: (type: string, data: any) => void,
): () => void {
  const es = new EventSource(`/api/debates/${debateId}/stream`)
  const types = ['debate.started', 'round.started', 'turn.done', 'turn.rejected',
                 'blackboard.updated', 'card.created', 'debate.ended', 'error']
  types.forEach(t =>
    es.addEventListener(t, (e: MessageEvent) => {
      try { on(t, JSON.parse(e.data)) } catch { on(t, {}) }
      if (t === 'debate.ended' || t === 'error') es.close()
    }),
  )
  es.onerror = () => es.close()
  return () => es.close()
}
