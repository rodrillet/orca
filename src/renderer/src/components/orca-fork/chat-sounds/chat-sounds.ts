// orca-fork: subtle chat sounds, as OpenBot's and agentes.chat's: synthesized once with Web Audio,
// played low. A key click while typing in a chat box, a soft blip on send, a two-note chime when a
// bot's chat gets a new message. Off for muted channels; one switch in Settings › Notifications.

export type ChatSound = 'key' | 'send' | 'receive'

const SAMPLE_RATE = 44_100
/** The same sound twice this close is one (a burst of events). */
const REPEAT_MS = 150
/** A key this soon after the last plays nothing (held keys, fast runs). */
const KEY_REPEAT_MS = 45
/** Each key a little higher or lower, so a run sounds like typing. */
const KEY_DETUNE = 0.06

let context: AudioContext | null = null
let output: GainNode | null = null
const buffers = new Map<ChatSound, AudioBuffer>()
const lastPlayed = new Map<ChatSound, number>()

/** Samples for one sound: a filtered noise tick, a rising blip, or a two-note chime. */
export function renderChatSound(sound: ChatSound): Float32Array {
  if (sound === 'key') {
    const length = Math.round(SAMPLE_RATE * 0.025)
    const samples = new Float32Array(length)
    let previous = 0
    for (let i = 0; i < length; i += 1) {
      const decay = Math.exp(-i / (SAMPLE_RATE * 0.004))
      // A one-pole low-pass over white noise: a soft tick, not a hiss.
      previous = previous * 0.6 + (Math.random() * 2 - 1) * 0.4
      samples[i] = previous * decay * 0.5
    }
    return samples
  }
  const notes: [number, number, number][] =
    sound === 'send'
      ? [[660, 0, 0.09]]
      : [
          [880, 0, 0.16],
          [1320, 0.07, 0.22]
        ]
  const length = Math.round(SAMPLE_RATE * Math.max(...notes.map(([, at, d]) => at + d)))
  const samples = new Float32Array(length)
  for (const [frequency, at, duration] of notes) {
    const start = Math.round(at * SAMPLE_RATE)
    const end = Math.min(length, start + Math.round(duration * SAMPLE_RATE))
    for (let i = start; i < end; i += 1) {
      const t = (i - start) / SAMPLE_RATE
      const attack = Math.min(1, t / 0.005)
      const release = Math.exp(-t / (duration / 4))
      // `send` glides up a little, so it reads as "off it goes".
      const f = sound === 'send' ? frequency * (1 + t * 3) : frequency
      samples[i] += Math.sin(2 * Math.PI * f * t) * attack * release * 0.35
    }
  }
  return samples
}

function audio(volume: number): AudioContext | null {
  if (typeof AudioContext === 'undefined') {
    return null
  }
  if (!context) {
    context = new AudioContext()
    output = context.createGain()
    output.connect(context.destination)
  }
  if (output) {
    output.gain.value = volume
  }
  return context
}

export function playChatSound(sound: ChatSound, volume: number): void {
  const now = performance.now()
  const repeat = sound === 'key' ? KEY_REPEAT_MS : REPEAT_MS
  if (now - (lastPlayed.get(sound) ?? -Infinity) < repeat) {
    return
  }
  lastPlayed.set(sound, now)
  const ctx = audio(volume)
  if (!ctx || !output) {
    return
  }
  // Chromium starts audio suspended until a user gesture; a sound before it is skipped, not queued.
  if (ctx.state === 'suspended') {
    void ctx.resume()
    return
  }
  let buffer = buffers.get(sound)
  if (!buffer) {
    const samples = renderChatSound(sound)
    buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.getChannelData(0).set(samples)
    buffers.set(sound, buffer)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  if (sound === 'key') {
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * KEY_DETUNE
  }
  source.connect(output)
  source.start()
}

/** A key in a chat box that is typing: a character, Backspace or Delete, no shortcut modifier. */
export function isTypingKey(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'repeat' | 'isComposing'>
): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) {
    return false
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    return true
  }
  return !event.repeat && event.key.length === 1
}
