#!/usr/bin/env node
// orca-fork: the machine's agent computers (docs/fork/agent-computer.md). Each computer is one container
// (its own desktop, browser and home); this hub creates/starts/stops them and keeps whose turn it is.
// Its HTTP API listens on 127.0.0.1 only: the paired Orca desktop reaches it through the runtime tunnel.
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const HERE = import.meta.dirname
export const HUB_PORT = Number(process.env.ORCA_COMPUTERS_HUB_PORT || 6079)
export const IMAGE = process.env.ORCA_COMPUTER_IMAGE || 'orca-agent-computer:1'
const STATE_DIR = join(
  process.env.XDG_STATE_HOME || join(homedir(), '.local/state'),
  'orca-fork/computers'
)
export const STATE_FILE = join(STATE_DIR, 'state.json')
const INSTALL_DIR = join(
  process.env.XDG_DATA_HOME || join(homedir(), '.local/share'),
  'orca-fork/agent-computer'
)
const FIRST_WEB_PORT = 6100
const UNIT = 'orca-agent-computers.service'

export function containerName(id) {
  return `orca-computer-${id}`
}

export async function readState() {
  try {
    const state = JSON.parse(await readFile(STATE_FILE, 'utf8'))
    return { computers: Array.isArray(state.computers) ? state.computers : [] }
  } catch {
    return { computers: [] }
  }
}

async function writeState(state) {
  await mkdir(STATE_DIR, { recursive: true, mode: 0o700 })
  const temp = `${STATE_FILE}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  await rename(temp, STATE_FILE)
}

// Writes are serialized so two requests can't drop each other's change.
let writing = Promise.resolve()
function updateState(change) {
  const next = writing.then(async () => {
    const state = await readState()
    const result = await change(state)
    await writeState(state)
    return result
  })
  writing = next.catch(() => undefined)
  return next
}

export function findComputer(state, ref) {
  if (!ref) {
    return state.computers.length === 1 ? state.computers[0] : undefined
  }
  const wanted = String(ref).toLowerCase()
  return state.computers.find((c) => c.id === ref || c.name.toLowerCase() === wanted)
}

async function docker(...args) {
  const { stdout } = await run('docker', args, { timeout: 120_000 })
  return stdout.trim()
}

async function containerStatus(id) {
  try {
    const status = await docker('inspect', '-f', '{{.State.Status}}', containerName(id))
    return status === 'running' ? 'running' : 'stopped'
  } catch {
    return 'missing'
  }
}

async function startContainer(computer) {
  const status = await containerStatus(computer.id)
  if (status === 'running') {
    return
  }
  if (status === 'stopped') {
    await docker('start', containerName(computer.id))
    return
  }
  await docker(
    'run',
    '--detach',
    '--name',
    containerName(computer.id),
    '--hostname',
    computer.id,
    '--label',
    `orca-fork.computer=${computer.id}`,
    '--restart',
    'unless-stopped',
    '--publish',
    `127.0.0.1:${computer.webPort}:6080`,
    '--volume',
    `${containerName(computer.id)}-home:/home/agent`,
    '--shm-size',
    '1g',
    '--memory',
    process.env.ORCA_COMPUTER_MEMORY || '3g',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--env',
    `VNC_PASSWORD=${computer.password}`,
    IMAGE
  )
}

function slug(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'computer'
  )
}

export async function createComputer(name) {
  const cleanName = String(name || '').trim() || 'Computador'
  const computer = await updateState((state) => {
    let id = slug(cleanName)
    for (let n = 2; state.computers.some((c) => c.id === id); n += 1) {
      id = `${slug(cleanName)}-${n}`
    }
    const used = new Set(state.computers.map((c) => c.webPort))
    let webPort = FIRST_WEB_PORT
    while (used.has(webPort)) {
      webPort += 1
    }
    const created = {
      id,
      name: cleanName,
      webPort,
      password: randomBytes(12).toString('base64url').slice(0, 8),
      createdAt: new Date().toISOString(),
      control: { holder: null }
    }
    state.computers.push(created)
    return created
  })
  await startContainer(computer)
  return computer
}

export async function setControl(id, holder) {
  return updateState((state) => {
    const computer = findComputer(state, id)
    if (!computer) {
      throw Object.assign(new Error('No such computer'), { status: 404 })
    }
    const previous = computer.control ?? { holder: null }
    const now = new Date().toISOString()
    computer.control =
      holder === 'owner'
        ? { holder: 'owner', since: now }
        : { holder: null, returnedAt: previous.holder === 'owner' ? now : previous.returnedAt }
    return computer.control
  })
}

async function publicComputer(computer) {
  return {
    id: computer.id,
    name: computer.name,
    status: await containerStatus(computer.id),
    control: computer.control ?? { holder: null }
  }
}

async function readBody(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 16_384) {
      throw Object.assign(new Error('Body too large'), { status: 413 })
    }
  }
  return raw ? JSON.parse(raw) : {}
}

// The paired desktop learns the tunnel's runtime revision from this page's title (its port probe).
const RUNTIME_FILE = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), '.config'),
  'orca/orca-runtime.json'
)

async function discoveryPage() {
  const runtime = JSON.parse(await readFile(RUNTIME_FILE, 'utf8'))
  return `<!doctype html><title>orca-computers v1 ${runtime.runtimeId} ${runtime.startedAt}</title>`
}

async function route(request) {
  const url = new URL(request.url ?? '/', 'http://hub')
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'v1' || parts[1] !== 'computers') {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }
  const [, , id, action] = parts
  if (!id && request.method === 'GET') {
    const state = await readState()
    return { computers: await Promise.all(state.computers.map(publicComputer)) }
  }
  if (!id && request.method === 'POST') {
    const body = await readBody(request)
    return publicComputer(await createComputer(body.name))
  }
  const computer = findComputer(await readState(), id)
  if (!computer) {
    throw Object.assign(new Error('No such computer'), { status: 404 })
  }
  if (action === 'viewer' && request.method === 'GET') {
    await startContainer(computer)
    return { webPort: computer.webPort, password: computer.password }
  }
  if (action === 'control' && request.method === 'POST') {
    const body = await readBody(request)
    return setControl(computer.id, body.holder === 'owner' ? 'owner' : null)
  }
  if (action === 'start' && request.method === 'POST') {
    await startContainer(computer)
    return publicComputer(computer)
  }
  if (action === 'stop' && request.method === 'POST') {
    await docker('stop', containerName(computer.id)).catch(() => '')
    return publicComputer(computer)
  }
  throw Object.assign(new Error('Not found'), { status: 404 })
}

function serve() {
  const reply = (response, status, type, body) => {
    response.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) })
    response.end(body)
  }
  const server = createServer((request, response) => {
    if (request.url === '/' && request.method === 'GET') {
      discoveryPage().then(
        (html) => reply(response, 200, 'text/html', html),
        () => reply(response, 503, 'text/plain', '')
      )
      return
    }
    route(request).then(
      (result) => reply(response, 200, 'application/json', JSON.stringify(result)),
      (error) =>
        reply(
          response,
          error.status ?? 500,
          'application/json',
          JSON.stringify({ error: String(error.message ?? error) })
        )
    )
  })
  server.listen(HUB_PORT, '127.0.0.1', () => {
    console.log(`orca agent computers hub on 127.0.0.1:${HUB_PORT}`)
  })
}

async function install() {
  await docker('build', '-t', IMAGE, join(HERE, 'image'))
  await mkdir(INSTALL_DIR, { recursive: true })
  for (const file of ['agent-computer-hub.mjs', 'agent-computer-mcp.mjs']) {
    await copyFile(join(HERE, file), join(INSTALL_DIR, file))
  }
  const { stdout: nodePath } = await run('readlink', ['-f', process.execPath])
  const unitDir = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'systemd/user')
  await mkdir(unitDir, { recursive: true })
  await writeFile(
    join(unitDir, UNIT),
    [
      '[Unit]',
      'Description=Orca agent computers hub',
      '',
      '[Service]',
      `ExecStart=${nodePath.trim()} ${join(INSTALL_DIR, 'agent-computer-hub.mjs')} serve`,
      'Restart=on-failure',
      'RestartSec=3',
      '',
      '[Install]',
      'WantedBy=default.target',
      ''
    ].join('\n')
  )
  await run('systemctl', ['--user', 'daemon-reload'])
  await run('systemctl', ['--user', 'enable', UNIT])
  await run('systemctl', ['--user', 'restart', UNIT])
  await run('loginctl', ['enable-linger']).catch(() => undefined)
  const mcp = [nodePath.trim(), join(INSTALL_DIR, 'agent-computer-mcp.mjs')]
  await run('claude', ['mcp', 'remove', '--scope', 'user', 'agent-computer']).catch(() => undefined)
  await run('claude', ['mcp', 'add', '--scope', 'user', 'agent-computer', '--', ...mcp]).catch(() =>
    console.log('claude not found: register the MCP server by hand')
  )
  if (existsSync(STATE_FILE)) {
    for (const computer of (await readState()).computers) {
      await startContainer(computer)
    }
  }
  console.log(`hub: ${UNIT} on 127.0.0.1:${HUB_PORT}\nMCP server: ${mcp.join(' ')}`)
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  switch (command) {
    case 'serve':
      return serve()
    case 'install':
      return install()
    case 'create':
      return console.log(JSON.stringify(await createComputer(args.join(' ')), null, 2))
    case 'list': {
      const state = await readState()
      return console.log(JSON.stringify(await Promise.all(state.computers.map(publicComputer))))
    }
    default:
      console.log('Usage: agent-computer-hub.mjs install | serve | create <name> | list')
      process.exitCode = 2
  }
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  await main()
}
