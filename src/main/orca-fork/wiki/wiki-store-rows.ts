// orca-fork: the wiki's tables and how their rows read back.
import { WIKI_LIMITS, type WikiActor } from '../../../shared/orca-fork/wiki/wiki-types'
import { wikiSlug } from '../../../shared/orca-fork/wiki/wiki-links'

import { WikiError } from './wiki-error'

export { WikiError }

export type Row = Record<string, unknown>

export const text = (value: unknown): string => (typeof value === 'string' ? value : '')
export const num = (value: unknown): number =>
  typeof value === 'number' ? value : typeof value === 'bigint' ? Number(value) : 0
export const optionalNum = (value: unknown): number | null =>
  value === null || value === undefined ? null : num(value)

function parseJson(value: unknown): unknown {
  try {
    return JSON.parse(text(value))
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function actorOf(value: unknown): WikiActor {
  const parsed = parseJson(value)
  if (isRecord(parsed)) {
    if (parsed.kind === 'bot' && typeof parsed.botId === 'string') {
      return { kind: 'bot', botId: parsed.botId, name: text(parsed.name) || parsed.botId }
    }
    if (parsed.kind === 'agent') {
      return { kind: 'agent', name: text(parsed.name) || 'Agent' }
    }
  }
  return { kind: 'owner' }
}

export function tagsOf(value: unknown): string[] {
  const parsed = parseJson(value)
  return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
}

export function excerptOf(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/[[\]*_`>#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220)
}

export function cleanFolder(folder: string | undefined): string {
  return (folder ?? '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/')
    .slice(0, WIKI_LIMITS.folder)
}

export function checkTitle(title: string): string {
  const clean = title.trim().slice(0, WIKI_LIMITS.title)
  if (!clean || !wikiSlug(clean)) {
    throw new WikiError('A page needs a title with letters or numbers.')
  }
  return clean
}

export function checkBody(body: string): string {
  if (body.length > WIKI_LIMITS.body) {
    throw new WikiError(`A page holds up to ${WIKI_LIMITS.body} characters.`)
  }
  return body
}

export const SCHEMA = `
create table if not exists wiki_pages (
  id text primary key,
  workspace_id text not null,
  slug text not null,
  title text not null,
  folder text not null default '',
  body text not null default '',
  tags text not null default '[]',
  version integer not null default 1,
  created_at integer not null,
  created_by text not null,
  updated_at integer not null,
  updated_by text not null,
  view_count integer not null default 0,
  last_viewed_at integer,
  deleted_at integer,
  deleted_by text
);
create unique index if not exists wiki_pages_live_slug
  on wiki_pages (workspace_id, slug) where deleted_at is null;
create index if not exists wiki_pages_workspace on wiki_pages (workspace_id, updated_at);
create table if not exists wiki_versions (
  page_id text not null,
  version integer not null,
  title text not null,
  folder text not null,
  body text not null,
  tags text not null,
  at integer not null,
  by text not null,
  note text,
  primary key (page_id, version)
);
create table if not exists wiki_views (
  page_id text not null,
  at integer not null,
  actor_key text not null,
  by text not null,
  chat_id text
);
create index if not exists wiki_views_page on wiki_views (page_id, at);
create table if not exists wiki_mentions (
  page_id text not null,
  kind text not null,
  source_id text not null,
  title text not null,
  at integer not null,
  by text,
  primary key (page_id, kind, source_id)
);
create index if not exists wiki_mentions_source on wiki_mentions (kind, source_id);
`
