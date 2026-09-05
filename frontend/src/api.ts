import type {
  Brain, Card, Debate, DebateConfig, GraphResponse, Idea, IdeaStatus, Level,
  NightPrefs, NightStatus, SettingsView, Turn,
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

  // ---- ideas (灵光 / 我来出题 / agent 提案)
  ideas: (q: { status?: IdeaStatus; origin?: 'user' | 'agent' } = {}) => {
    const p = new URLSearchParams(q as Record<string, string>)
    return req<Idea[]>(`/api/ideas${p.toString() ? `?${p}` : ''}`)
  },
  idea: (id: string) => req<Idea>(`/api/ideas/${id}`),
  createIdea: (body: {
    text?: string; kind?: 'eureka' | 'motion'; brain_id?: string | null
    image_data_url?: string; image_caption?: string
  }) => req<Idea>('/api/ideas', { method: 'POST', headers: J, body: JSON.stringify(body) }),
  patchIdea: (id: string, patch: {
    text?: string; brain_id?: string | null; status?: IdeaStatus; image_caption?: string
  }) => req<Idea>(`/api/ideas/${id}`, { method: 'PATCH', headers: J, body: JSON.stringify(patch) }),
  deleteIdea: (id: string) => req<{ ok: boolean }>(`/api/ideas/${id}`, { method: 'DELETE' }),
  rehit: (id: string, wildness: number) =>
    req<Idea>(`/api/ideas/${id}/rehit?wildness=${wildness}`, { method: 'POST' }),
  ideaImage: (id: string) => `/api/ideas/${id}/image`,

  // ---- 夜间发现
  night: () => req<NightStatus>('/api/night'),
  putNight: (p: NightPrefs) =>
    req<NightStatus>('/api/night', { method: 'PUT', headers: J, body: JSON.stringify(p) }),
  runNight: () => req<NightStatus>('/api/night/run', { method: 'POST' }),
  rephrase: (id: string) =>
    req<Idea>(`/api/night/ideas/${id}/rephrase`, { method: 'POST' }),

  // ---- debates
  createDebate: (ideaId: string, config: Partial<DebateConfig>) =>
    req<Debate>('/api/debates', {
      method: 'POST', headers: J,
      body: JSON.stringify({ idea_id: ideaId, config }),
    }),
  debate: (id: string) => req<Debate>(`/api/debates/${id}`),
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
