// Mirrors backend/app/models.py. Change both in the same commit.

export type Role = 'moderator' | 'proposer' | 'analogist' | 'skeptic' | 'pragmatist'
export type Stance = 'support' | 'attack' | 'reframe' | 'summary'
export type Level = 'brain' | 'cluster' | 'chunk'

export interface Brain {
  id: string; name: string; kind: string; color: string
  source?: string | null; provider?: string | null; model?: string | null
  persona?: string | null; chunk_count: number; created_at: string
}

export interface GraphNode {
  id: string; level: Level; label: string; brain_id: string; color: string
  x: number; y: number; z: number; size: number
  preview?: string | null; source_path?: string | null
  // injected client-side for force-graph pinning
  fx?: number; fy?: number; fz?: number
}
export interface GraphLink {
  source: string; target: string
  kind: 'contains' | 'similar' | 'hit' | 'citation'; weight: number
}
export interface GraphResponse {
  level: Level; nodes: GraphNode[]; links: GraphLink[]; total_chunks: number
}

export interface Skeleton {
  object: string; constraint: string; mechanism: string; motivation: string
  keywords: string[]
}
export interface Hit {
  chunk_id: string; brain_id: string; brain_name: string
  score: number; band_score: number; text: string; source_path?: string | null
}
export interface Spark {
  id: string; text: string; kind: string; status: string
  skeleton?: Skeleton | null; hits: Hit[]; created_at: string
}

export interface Claim {
  id: string; role: Role; brain_id?: string | null; text: string
  stance: Stance; status: 'live' | 'refuted' | 'accepted'
  citations: string[]; round: number
}
export interface Blackboard {
  motion: string; round: number; claims: Claim[]
  open_questions: string[]; agreements: string[]; resources: string[]; digest: string
}
export interface Turn {
  id: string; debate_id: string; round: number; seq: number; role: Role
  brain_id?: string | null; brain_name?: string | null
  stance?: Stance | null; claim?: string | null; body: string
  citations: string[]; attacks: string[]; novelty?: number | null
  rejected: boolean; tokens: number; created_at: string
}
export interface DebateConfig {
  wildness: number; max_rounds: number; token_budget: number; min_brains: number
  novelty_threshold: number; require_attack_per_round: boolean
  mode: 'live' | 'dream'
}
export interface Debate {
  id: string; spark_id?: string | null; motion: string; status: string
  mode: string; config: DebateConfig; blackboard: Blackboard
  tokens_used: number; created_at: string; ended_at?: string | null
}

export interface Connection {
  chunk_id: string; brain_id: string; brain_name: string
  quote: string; source_path?: string | null
}
export interface Scores {
  surprise: number; credibility: number; feasibility: number; total: number
}
export interface Card {
  id: string; debate_id?: string | null; connection: Connection[]
  idea: string; why_you: string; next_action: string
  scores: Scores; saved: boolean; created_at: string
}

export interface ProviderConfig {
  id: string; kind: 'openai_compat' | 'anthropic' | 'ollama' | 'mock'
  base_url?: string | null; api_key?: string | null
  chat_model: string; embed_model?: string | null; note?: string | null
  has_key?: boolean
}
export interface SettingsView {
  offline: boolean; default_chat?: string | null; default_embed?: string | null
  moderator_provider?: string | null; providers: ProviderConfig[]
}

export type EventType =
  | 'debate.started' | 'round.started' | 'turn.streaming' | 'turn.done'
  | 'turn.rejected' | 'blackboard.updated' | 'card.created'
  | 'debate.ended' | 'error' | 'ping'

export const ROLE_CN: Record<Role, string> = {
  moderator: '主持人', proposer: '提案者', analogist: '类比者',
  skeptic: '怀疑者', pragmatist: '实践者',
}
export const STANCE_COLOR: Record<string, string> = {
  support: '#7fa86a', attack: '#d9704f', reframe: '#b98bd3', summary: '#7aa2c2',
}
export const STANCE_CN: Record<string, string> = {
  support: '支持', attack: '反对', reframe: '重构', summary: '小结',
}
