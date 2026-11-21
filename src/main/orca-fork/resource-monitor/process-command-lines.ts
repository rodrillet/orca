// orca-fork: command lines and working folders of processes, read only to tell which agent a process is
// and where it runs. Command lines stay in this process; only a program label leaves it.
import { readlink } from 'node:fs/promises'
import os from 'node:os'
import { runProcess } from '@orca/process-host'
import type { ProcIndex } from '../../memory/process-index'

const PS_TIMEOUT_MS = 5_000
const PS_MAX_BUFFER = 16 * 1024 * 1024
const LSOF_TIMEOUT_MS = 3_000

/** pid → command line on macOS/Linux; on Windows the executable name the sweep already has. */
export async function readProcessArgs(
  index: ProcIndex,
  only?: readonly number[]
): Promise<Map<number, string>> {
  const args = new Map<number, string>()
  if (os.platform() === 'win32') {
    for (const row of index.byPid.values()) {
      if (row.name && (!only || only.includes(row.pid))) {
        args.set(row.pid, row.name)
      }
    }
    return args
  }
  try {
    const result = await runProcess({
      program: 'ps',
      args: only ? ['-o', 'pid=,args=', '-p', only.join(',')] : ['-axo', 'pid=,args='],
      maxOutputBytes: PS_MAX_BUFFER,
      timeoutMs: PS_TIMEOUT_MS,
      env: { ...process.env, LC_ALL: 'C', LANG: 'C' }
    })
    if (result.timedOut || result.outputTruncated) {
      return args
    }
    for (const line of result.stdout.split('\n')) {
      const match = /^\s*(\d+)\s+(.*)$/u.exec(line)
      if (match) {
        args.set(Number(match[1]), match[2])
      }
    }
  } catch (err) {
    console.warn('[orca-fork] process command lines unavailable', err)
  }
  return args
}

/** pid → working folder; missing where the host can't tell (Windows, a process that exited). */
export async function readProcessCwds(pids: readonly number[]): Promise<Map<number, string>> {
  const cwds = new Map<number, string>()
  if (pids.length === 0) {
    return cwds
  }
  const platform = os.platform()
  if (platform === 'linux') {
    await Promise.all(
      pids.map(async (pid) => {
        try {
          cwds.set(pid, await readlink(`/proc/${pid}/cwd`))
        } catch {
          // exited, or another user's process
        }
      })
    )
  } else if (platform === 'darwin') {
    try {
      const result = await runProcess({
        program: 'lsof',
        args: ['-a', '-d', 'cwd', '-p', pids.join(','), '-Fn'],
        maxOutputBytes: 1024 * 1024,
        timeoutMs: LSOF_TIMEOUT_MS
      })
      let pid: number | null = null
      for (const line of result.stdout.split('\n')) {
        if (line.startsWith('p')) {
          pid = Number(line.slice(1))
        } else if (line.startsWith('n') && pid !== null) {
          cwds.set(pid, line.slice(1))
        }
      }
    } catch {
      // lsof missing or timed out: rows just show no folder
    }
  }
  return cwds
}
