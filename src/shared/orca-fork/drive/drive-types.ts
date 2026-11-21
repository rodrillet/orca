// orca-fork: the Drive's records, shared by the host store, its RPC methods, the CLI and the page.
import type { ForkWorkspaceId } from '../workspaces/fork-workspace'

export type DriveWorkspaceId = ForkWorkspaceId

export const DRIVE_FILE_MAX_BYTES = 200 * 1024 * 1024

/** 384 KiB of bytes is 512 KiB of base64, the frame size chat attachments use. */
export const DRIVE_CHUNK_BYTES = 384 * 1024

export const DRIVE_CHUNK_BASE64_CHARS = (DRIVE_CHUNK_BYTES / 3) * 4

/** Where a file came from, so the Drive can link back to it. */
export type DriveFileSource =
  | { kind: 'upload' }
  | {
      kind: 'chat-attachment'
      sessionId: string
      botId?: string
      botName?: string
      /** The message's first words. */
      excerpt?: string
      /** The message's journal item, which Open the chat scrolls to. */
      messageId?: string
    }
  | {
      kind: 'agent'
      sessionId?: string
      botId?: string
      botName?: string
      /** What the agent said the file is. */
      note?: string
    }

export type DriveFileKind =
  | 'image'
  | 'pdf'
  | 'markdown'
  | 'text'
  | 'code'
  | 'video'
  | 'audio'
  | 'archive'
  | 'document'
  | 'spreadsheet'
  | 'other'

export const DRIVE_FILE_KINDS: readonly DriveFileKind[] = [
  'image',
  'pdf',
  'document',
  'spreadsheet',
  'markdown',
  'text',
  'code',
  'video',
  'audio',
  'archive',
  'other'
]

export type DriveFile = {
  id: string
  name: string
  folderId: string | null
  kind: DriveFileKind
  mimeType: string
  byteLength: number
  createdAt: number
  updatedAt: number
  trashedAt: number | null
  source: DriveFileSource
  /** The fork workspace it was put in; absent, the desktop places it by its bot or machine. */
  workspaceId?: ForkWorkspaceId
}

export type DriveFolder = {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  trashedAt: number | null
  workspaceId?: ForkWorkspaceId
}

export type DriveListResult = {
  files: DriveFile[]
  folders: DriveFolder[]
}

export type DriveReadResult = {
  contentBase64: string
  offset: number
  byteLength: number
  totalBytes: number
  mimeType: string
}

const EXTENSION_KINDS: Record<string, DriveFileKind> = {}
const EXTENSION_MIME: Record<string, string> = {}

function register(kind: DriveFileKind, entries: Record<string, string>): void {
  for (const [extension, mime] of Object.entries(entries)) {
    EXTENSION_KINDS[extension] = kind
    EXTENSION_MIME[extension] = mime
  }
}

register('image', {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif'
})
register('pdf', { pdf: 'application/pdf' })
register('markdown', { md: 'text/markdown', markdown: 'text/markdown', mdx: 'text/markdown' })
register('text', {
  txt: 'text/plain',
  log: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values'
})
register('code', {
  ts: 'text/plain',
  tsx: 'text/plain',
  js: 'text/javascript',
  jsx: 'text/plain',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  json: 'application/json',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  toml: 'text/plain',
  xml: 'application/xml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  scss: 'text/plain',
  py: 'text/x-python',
  rb: 'text/plain',
  go: 'text/plain',
  rs: 'text/plain',
  java: 'text/plain',
  kt: 'text/plain',
  swift: 'text/plain',
  c: 'text/plain',
  h: 'text/plain',
  cpp: 'text/plain',
  cs: 'text/plain',
  php: 'text/plain',
  sh: 'text/x-shellscript',
  bash: 'text/x-shellscript',
  zsh: 'text/x-shellscript',
  sql: 'text/plain',
  vue: 'text/plain',
  svelte: 'text/plain',
  ini: 'text/plain',
  env: 'text/plain'
})
register('video', {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska'
})
register('audio', {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac'
})
register('archive', {
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar'
})
register('document', {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  key: 'application/octet-stream'
})
register('spreadsheet', {
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  numbers: 'application/octet-stream'
})

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function driveFileKindOf(name: string): DriveFileKind {
  return EXTENSION_KINDS[extensionOf(name)] ?? 'other'
}

export function driveMimeTypeOf(name: string): string {
  return EXTENSION_MIME[extensionOf(name)] ?? 'application/octet-stream'
}

/** Kinds the page previews from the file's text. */
export function isDriveTextKind(kind: DriveFileKind): boolean {
  return kind === 'markdown' || kind === 'text' || kind === 'code'
}

/** The bot a file came from, when one is known. */
export function driveFileBotName(file: Pick<DriveFile, 'source'>): string | undefined {
  return file.source.kind === 'upload' ? undefined : file.source.botName
}

export function driveFileSessionId(file: Pick<DriveFile, 'source'>): string | undefined {
  return file.source.kind === 'upload' ? undefined : file.source.sessionId
}
