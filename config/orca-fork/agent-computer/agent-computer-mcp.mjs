#!/usr/bin/env node
// orca-fork: MCP server (stdio) that lets the agents on this machine see and drive its agent computers
// (agent-computer-hub.mjs): screenshot/click/type/key/scroll/open-url inside the computer's container.
// While the owner has control (taken in Orca's Computer pane) the input tools wait for the hand back.
import { execFile } from 'node:child_process'
import { createInterface } from 'node:readline'
import { promisify } from 'node:util'
import { containerName, findComputer, readState } from './agent-computer-hub.mjs'

const run = promisify(execFile)
const BUTTONS = { left: '1', middle: '2', right: '3' }
const SCROLL = { up: '4', down: '5', left: '6', right: '7' }
// Each agent remembers when it last saw the owner hand back, to tell it to look again once.
const seenReturns = new Map()

const computerArg = {
  computer: {
    type: 'string',
    description:
      'Computer name or id (computer_list). Defaults to ORCA_COMPUTER, or the only computer.'
  }
}
const point = {
  x: { type: 'integer', description: 'Screen x in pixels (screenshot coordinates)' },
  y: { type: 'integer', description: 'Screen y in pixels (screenshot coordinates)' }
}

function tool(name, description, properties = {}, required = []) {
  return {
    name,
    description,
    inputSchema: { type: 'object', properties: { ...computerArg, ...properties }, required }
  }
}

const TOOLS = [
  {
    name: 'computer_list',
    description: 'The agent computers on this machine, whether each runs and who has control.',
    inputSchema: { type: 'object', properties: {} }
  },
  tool(
    'computer_screenshot',
    'Screenshot of the computer (JPEG). Its pixels are the coordinates click/scroll take. The owner may be watching.'
  ),
  tool(
    'computer_click',
    'Move the pointer to (x, y) and click.',
    {
      ...point,
      button: { type: 'string', enum: ['left', 'middle', 'right'], default: 'left' },
      double: { type: 'boolean', default: false }
    },
    ['x', 'y']
  ),
  tool(
    'computer_drag',
    'Press the left button at (x, y), move to (to_x, to_y) and release.',
    { ...point, to_x: { type: 'integer' }, to_y: { type: 'integer' } },
    ['x', 'y', 'to_x', 'to_y']
  ),
  tool('computer_type', 'Type text at the keyboard focus.', { text: { type: 'string' } }, ['text']),
  tool(
    'computer_key',
    'Press keys or combos, xdotool names, space-separated: "Return", "ctrl+l", "ctrl+shift+t Escape".',
    { keys: { type: 'string' } },
    ['keys']
  ),
  tool(
    'computer_scroll',
    'Scroll at (x, y).',
    {
      ...point,
      direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
      amount: { type: 'integer', default: 3, minimum: 1, maximum: 30 }
    },
    ['x', 'y', 'direction']
  ),
  tool('computer_open_url', "Open a URL in the computer's Chromium.", { url: { type: 'string' } }, [
    'url'
  ])
]

async function resolveComputer(args) {
  const state = await readState()
  const ref = args.computer || process.env.ORCA_COMPUTER
  const computer = findComputer(state, ref)
  if (!computer) {
    const names = state.computers.map((c) => c.name).join(', ') || 'none yet'
    throw new Error(
      ref
        ? `No computer "${ref}". Computers: ${names}`
        : `Say which computer (computer_list). Computers: ${names}`
    )
  }
  return computer
}

/** Input waits while the owner drives; after a hand back the agent is told once to look again. */
function controlNote(computer, acting) {
  const control = computer.control ?? { holder: null }
  if (control.holder === 'owner') {
    if (acting) {
      throw new Error(
        `The owner has control of "${computer.name}" since ${control.since}. Wait, then check computer_list; screenshots still work.`
      )
    }
    return `The owner has control of "${computer.name}" right now.`
  }
  if (control.returnedAt && seenReturns.get(computer.id) !== control.returnedAt) {
    seenReturns.set(computer.id, control.returnedAt)
    return `The owner used "${computer.name}" and handed it back at ${control.returnedAt}: take a screenshot before acting.`
  }
  return ''
}

async function inContainer(computer, args, options = {}) {
  const { stdout } = await run('docker', ['exec', containerName(computer.id), ...args], {
    timeout: 20_000,
    maxBuffer: 32 * 1024 * 1024,
    ...options
  })
  return stdout
}

function xdotool(computer, ...args) {
  return inContainer(computer, ['xdotool', ...args])
}

async function screenshot(computer) {
  const image = await inContainer(
    computer,
    [
      'sh',
      '-c',
      'scrot --overwrite --quality 70 --pointer /tmp/orca-shot.jpg && cat /tmp/orca-shot.jpg'
    ],
    { encoding: 'buffer' }
  )
  return [{ type: 'image', data: image.toString('base64'), mimeType: 'image/jpeg' }]
}

async function act(name, computer, args) {
  switch (name) {
    case 'computer_click': {
      const button = BUTTONS[args.button ?? 'left'] ?? '1'
      const repeat = args.double ? ['--repeat', '2'] : []
      await xdotool(
        computer,
        'mousemove',
        '--sync',
        `${args.x}`,
        `${args.y}`,
        'click',
        ...repeat,
        button
      )
      return `Clicked ${args.button ?? 'left'} at ${args.x},${args.y}`
    }
    case 'computer_drag':
      await xdotool(computer, 'mousemove', '--sync', `${args.x}`, `${args.y}`, 'mousedown', '1')
      await xdotool(computer, 'mousemove', '--sync', `${args.to_x}`, `${args.to_y}`, 'mouseup', '1')
      return `Dragged ${args.x},${args.y} → ${args.to_x},${args.to_y}`
    case 'computer_type':
      await xdotool(computer, 'type', '--delay', '12', '--', String(args.text))
      return `Typed ${String(args.text).length} characters`
    case 'computer_key':
      await xdotool(
        computer,
        'key',
        '--delay',
        '30',
        ...String(args.keys).split(/\s+/).filter(Boolean)
      )
      return `Pressed ${args.keys}`
    case 'computer_scroll': {
      const amount = String(Math.min(30, Math.max(1, args.amount ?? 3)))
      const button = SCROLL[args.direction]
      if (!button) {
        throw new Error('direction must be up, down, left or right')
      }
      await xdotool(computer, 'mousemove', '--sync', `${args.x}`, `${args.y}`)
      await xdotool(computer, 'click', '--repeat', amount, button)
      return `Scrolled ${args.direction} ${amount} at ${args.x},${args.y}`
    }
    case 'computer_open_url': {
      const url = String(args.url)
      if (!/^https?:/i.test(url)) {
        throw new Error('Only http(s) URLs')
      }
      await run('docker', ['exec', '--detach', containerName(computer.id), 'chromium', url])
      return `Opened ${url}`
    }
    default:
      throw new Error(`Unknown tool ${name}`)
  }
}

async function callTool(name, args) {
  if (name === 'computer_list') {
    const state = await readState()
    const lines = state.computers.map((c) => {
      const holder = c.control?.holder === 'owner' ? 'owner has control' : 'agents may act'
      return `${c.name} (id ${c.id}): ${holder}`
    })
    return lines.join('\n') || 'No computers on this machine yet; the owner adds them in Orca.'
  }
  const computer = await resolveComputer(args)
  if (name === 'computer_screenshot') {
    const note = controlNote(computer, false)
    const image = await screenshot(computer)
    return note ? [{ type: 'text', text: note }, ...image] : image
  }
  const note = controlNote(computer, true)
  const done = await act(name, computer, args)
  return note ? `${note}\n${done}` : done
}

function send(message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
}

async function handle(request) {
  const { id, method, params } = request
  if (method === 'initialize') {
    return {
      protocolVersion: params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'orca-agent-computer', version: '0.2.0' },
      instructions:
        'Isolated Linux computers (desktop + Chromium) the agents on this machine share and the owner watches in Orca. Take a screenshot before acting and after each step. When the owner has control, input waits until they hand it back.'
    }
  }
  if (method === 'tools/list') {
    return { tools: TOOLS }
  }
  if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments ?? {})
      const content = typeof result === 'string' ? [{ type: 'text', text: result }] : result
      return { content }
    } catch (error) {
      return { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true }
    }
  }
  if (method === 'ping') {
    return {}
  }
  if (id !== undefined) {
    throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 })
  }
  return undefined
}

createInterface({ input: process.stdin }).on('line', async (line) => {
  if (!line.trim()) {
    return
  }
  let request
  try {
    request = JSON.parse(line)
  } catch {
    send({ id: null, error: { code: -32700, message: 'Parse error' } })
    return
  }
  try {
    const result = await handle(request)
    if (request.id !== undefined && result !== undefined) {
      send({ id: request.id, result })
    }
  } catch (error) {
    send({ id: request.id, error: { code: error.code ?? -32603, message: String(error.message) } })
  }
})
