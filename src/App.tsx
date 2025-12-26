import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Op = '+' | '-' | '*' | '/'

type NumberTile = {
  id: string
  value: number
}

type OperatorTile = {
  id: string
  op: Op
}

type Round = {
  target: number
  numbers: NumberTile[]
  sampleSolution: string
}

type Fraction = { n: bigint; d: bigint }

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

function normalizeFraction(frac: Fraction): Fraction {
  if (frac.d === 0n) throw new Error('Division by zero')
  if (frac.n === 0n) return { n: 0n, d: 1n }
  const sign = frac.d < 0n ? -1n : 1n
  const n = frac.n * sign
  const d = frac.d * sign
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

function intFrac(v: number): Fraction {
  return { n: BigInt(v), d: 1n }
}

function add(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d + b.n * a.d, d: a.d * b.d })
}

function sub(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.d - b.n * a.d, d: a.d * b.d })
}

function mul(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({ n: a.n * b.n, d: a.d * b.d })
}

function div(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0n) throw new Error('Division by zero')
  return normalizeFraction({ n: a.n * b.d, d: a.d * b.n })
}

function applyFractionOp(a: Fraction, b: Fraction, op: Op): Fraction {
  switch (op) {
    case '+':
      return add(a, b)
    case '-':
      return sub(a, b)
    case '*':
      return mul(a, b)
    case '/':
      return div(a, b)
  }
}

function evalNoParens3(a: number, op1: Op, b: number, op2: Op, c: number): Fraction {
  const A = intFrac(a)
  const B = intFrac(b)
  const C = intFrac(c)

  const op1Low = op1 === '+' || op1 === '-'
  const op2High = op2 === '*' || op2 === '/'
  const op1High = op1 === '*' || op1 === '/'
  const op2Low = op2 === '+' || op2 === '-'

  if (op1Low && op2High) {
    const bc = applyFractionOp(B, C, op2)
    return applyFractionOp(A, bc, op1)
  }

  if (op1High && op2Low) {
    const ab = applyFractionOp(A, B, op1)
    return applyFractionOp(ab, C, op2)
  }

  const ab = applyFractionOp(A, B, op1)
  return applyFractionOp(ab, C, op2)
}

function fractionEqualsInt(frac: Fraction, target: number): boolean {
  return frac.n === BigInt(target) * frac.d
}

function formatOp(op: Op): string {
  switch (op) {
    case '+':
      return '+'
    case '-':
      return '−'
    case '*':
      return '×'
    case '/':
      return '÷'
  }
}

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const answerLoaders = import.meta.glob<string>('../game_logic/answers/*.txt', {
  query: '?raw',
  import: 'default',
})

function buildAnswerIndex(): Map<number, () => Promise<string>> {
  const idx = new Map<number, () => Promise<string>>()
  for (const [path, loader] of Object.entries(answerLoaders)) {
    const name = path.split('/').pop() ?? ''
    const m = /^(\d+)\.txt$/.exec(name)
    if (!m) continue
    idx.set(Number(m[1]), loader)
  }
  return idx
}

const answerIndex = buildAnswerIndex()

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function parseNumbersFromSolution(solution: string): number[] {
  const nums = Array.from(solution.matchAll(/\d+/g), (m) => Number(m[0]))
  if (nums.length !== 3) throw new Error(`Expected 3 numbers in solution: ${solution}`)
  return nums
}

async function loadRoundFromAnswers(): Promise<Round> {
  const targets = Array.from(answerIndex.keys()).filter((t) => t >= 1 && t <= 99)
  if (targets.length === 0) throw new Error('No answer files found.')

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const target = randomChoice(targets)
    const loader = answerIndex.get(target)
    if (!loader) continue
    const raw = await loader()
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) continue

    const sampleSolution = randomChoice(lines)
    const values = shuffle(parseNumbersFromSolution(sampleSolution))
    const numbers = values.map((value) => ({ id: newId(), value }))
    return { target, numbers, sampleSolution }
  }

  throw new Error('Unable to find a solvable target (too many empty files).')
}

function Card(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={classNames(
        'rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-sm shadow-black/5',
        props.className,
      )}
    >
      {props.children}
    </div>
  )
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props
  return (
    <button
      {...rest}
      className={classNames(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm shadow-black/5 transition active:scale-[0.98] disabled:opacity-50',
        className,
      )}
    />
  )
}

function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props
  return (
    <button
      {...rest}
      className={classNames(
        'inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 text-sm font-semibold text-[color:var(--text)] shadow-sm shadow-black/5 transition active:scale-[0.98] disabled:opacity-50',
        className,
      )}
    />
  )
}

function VolumeIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

function tileBaseClasses(kind: 'number' | 'op'): string {
  return classNames(
    'select-none touch-none',
    'shadow-sm shadow-black/10',
    'border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)]',
    'active:scale-[0.98]',
    kind === 'number' ? 'rounded-2xl' : 'rounded-full',
  )
}

type SlotIndex = 0 | 1 | 2 | 3 | 4
type Slots = {
  0: string | null
  1: Op | null
  2: string | null
  3: Op | null
  4: string | null
}

function initialSlots(): Slots {
  return { 0: null, 1: null, 2: null, 3: null, 4: null }
}

function isNumberSlot(i: SlotIndex): i is 0 | 2 | 4 {
  return i === 0 || i === 2 || i === 4
}

function isOpSlot(i: SlotIndex): i is 1 | 3 {
  return i === 1 || i === 3
}

function pointInRect(p: { x: number; y: number }, rect: DOMRect): boolean {
  return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

type AudioPrefs = { bgmVolume: number; sfxVolume: number }

function loadAudioPrefs(): AudioPrefs {
  try {
    const bgmRaw = localStorage.getItem('ng_bgm_volume')
    const sfxRaw = localStorage.getItem('ng_sfx_volume')
    return {
      bgmVolume: clamp01(bgmRaw ? Number(bgmRaw) : 0.6),
      sfxVolume: clamp01(sfxRaw ? Number(sfxRaw) : 0.8),
    }
  } catch {
    return { bgmVolume: 0.6, sfxVolume: 0.8 }
  }
}

function saveAudioPrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem('ng_bgm_volume', String(prefs.bgmVolume))
    localStorage.setItem('ng_sfx_volume', String(prefs.sfxVolume))
  } catch {
    // ignore
  }
}

export default function App() {
  const prefersReducedMotion = useReducedMotion()
  const DEV_CHEAT = import.meta.env.DEV

  const [round, setRound] = useState<Round | null>(null)
  const [loadingRound, setLoadingRound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [solvedCount, setSolvedCount] = useState(0)
  const [slots, setSlots] = useState<Slots>(initialSlots)
  const [celebrating, setCelebrating] = useState(false)
  const [operatorTiles, setOperatorTiles] = useState<OperatorTile[]>(() =>
    (['+', '-', '*', '/'] as const).map((op) => ({ id: newId(), op })),
  )
  const solveTimerRef = useRef<number | null>(null)
  const [draggingType, setDraggingType] = useState<'number' | 'op' | null>(null)

  const [audioPanelOpen, setAudioPanelOpen] = useState(false)
  const [audioPrefs, setAudioPrefs] = useState<AudioPrefs>(() => loadAudioPrefs())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sfxContextRef = useRef<AudioContext | null>(null)

  const trayRef = useRef<HTMLDivElement | null>(null)
  const slotRefs = useRef<Record<SlotIndex, HTMLDivElement | null>>({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null,
  })

  const numberById = useMemo(() => {
    const map = new Map<string, NumberTile>()
    for (const n of round?.numbers ?? []) map.set(n.id, n)
    return map
  }, [round])

  const attempt = useMemo(() => {
    if (!round) return null
    const aId = slots[0]
    const bId = slots[2]
    const cId = slots[4]
    const op1 = slots[1]
    const op2 = slots[3]
    if (!aId || !bId || !cId || !op1 || !op2) return null
    const a = numberById.get(aId)?.value
    const b = numberById.get(bId)?.value
    const c = numberById.get(cId)?.value
    if (a === undefined || b === undefined || c === undefined) return null
    const value = evalNoParens3(a, op1, b, op2, c)
    return { a, b, c, op1, op2, value }
  }, [numberById, round, slots])

  const canDrag = round !== null && !loadingRound && !celebrating
  const tileTextClass = 'text-2xl'

  const startNewRound = useCallback(async () => {
    if (loadingRound) return
    setLoadingRound(true)
    setLoadError(null)
    try {
      const next = await loadRoundFromAnswers()
      setRound(next)
      setSlots(initialSlots())
    } catch (e) {
      setRound(null)
      setLoadError(e instanceof Error ? e.message : 'Failed to load puzzle.')
    } finally {
      setCelebrating(false)
      setLoadingRound(false)
    }
  }, [loadingRound])

  function resetSolved(): void {
    setSolvedCount(0)
  }

  function findDropSlot(point: { x: number; y: number }): SlotIndex | null {
    const all: SlotIndex[] = [0, 1, 2, 3, 4]
    for (const i of all) {
      const el = slotRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (pointInRect(point, rect)) return i
    }
    return null
  }

  function droppedInTray(point: { x: number; y: number }): boolean {
    const el = trayRef.current
    if (!el) return false
    return pointInRect(point, el.getBoundingClientRect())
  }

  function placeNumber(tileId: string, slot: 0 | 2 | 4, allowOverwrite = false): void {
    setSlots((prev) => {
      if (!allowOverwrite && prev[slot] !== null) return prev
      const next: Slots = { ...prev }
      for (const i of [0, 2, 4] as const) {
        if (next[i] === tileId) next[i] = null
      }
      next[slot] = tileId
      return next
    })
  }

  function setOp(slot: 1 | 3, op: Op | null, allowOverwrite = false): void {
    setSlots((prev) => {
      if (!allowOverwrite && op !== null && prev[slot] !== null) return prev
      return { ...prev, [slot]: op }
    })
  }

  function moveNumber(tileId: string, from: 0 | 2 | 4, to: 0 | 2 | 4): void {
    setSlots((prev) => {
      if (prev[to] !== null) return prev
      const next: Slots = { ...prev }
      if (next[from] === tileId) {
        next[from] = null
        next[to] = tileId
      }
      return next
    })
  }

  function moveOp(op: Op, from: 1 | 3, to: 1 | 3): void {
    setSlots((prev) => {
      if (prev[to] !== null) return prev
      const next: Slots = { ...prev }
      if (next[from] === op) {
        next[from] = null
        next[to] = op
      }
      return next
    })
  }

  function replaceOperatorTile(id: string, op: Op): void {
    setOperatorTiles((prev) => {
      const index = prev.findIndex((t) => t.id === id)
      if (index === -1) return prev
      const next = prev.slice()
      next.splice(index, 1, { id: newId(), op })
      return next
    })
  }

  function ensureAudio(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current
    const audio = new Audio('/music.mp3')
    audio.loop = true
    audio.volume = audioPrefs.bgmVolume
    audioRef.current = audio
    return audio
  }

  async function tryPlayAudio(): Promise<void> {
    const audio = ensureAudio()
    if (audioPrefs.bgmVolume === 0) return
    audio.volume = audioPrefs.bgmVolume
    try {
      await audio.play()
    } catch {
      // mobile may block; try again on next user gesture
    }
  }

  function ensureSfxContext(): AudioContext {
    if (sfxContextRef.current) return sfxContextRef.current
    const ctx = new AudioContext()
    sfxContextRef.current = ctx
    return ctx
  }

  function playSfxClick(): void {
    if (audioPrefs.sfxVolume === 0) return
    const ctx = ensureSfxContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const now = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(audioPrefs.sfxVolume * 0.18, now + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.07)
  }

  function playSfxSuccess(): void {
    if (audioPrefs.sfxVolume === 0) return
    const ctx = ensureSfxContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const base = audioPrefs.sfxVolume * 0.22

    const oscA = ctx.createOscillator()
    const gainA = ctx.createGain()
    oscA.type = 'sine'
    oscA.frequency.setValueAtTime(440, now)
    gainA.gain.setValueAtTime(0, now)
    gainA.gain.linearRampToValueAtTime(base, now + 0.02)
    gainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
    oscA.connect(gainA).connect(ctx.destination)
    oscA.start(now)
    oscA.stop(now + 0.24)

    const oscB = ctx.createOscillator()
    const gainB = ctx.createGain()
    oscB.type = 'sine'
    oscB.frequency.setValueAtTime(660, now + 0.06)
    gainB.gain.setValueAtTime(0, now + 0.06)
    gainB.gain.linearRampToValueAtTime(base * 0.75, now + 0.09)
    gainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    oscB.connect(gainB).connect(ctx.destination)
    oscB.start(now + 0.06)
    oscB.stop(now + 0.34)
  }

  function setBgmVolume(volume: number): void {
    setAudioPrefs((prev) => {
      const next = { ...prev, bgmVolume: clamp01(volume) }
      saveAudioPrefs(next)
      return next
    })
  }

  function setSfxVolume(volume: number): void {
    setAudioPrefs((prev) => {
      const next = { ...prev, sfxVolume: clamp01(volume) }
      saveAudioPrefs(next)
      return next
    })
  }

  useEffect(() => {
    startNewRound()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const audio = ensureAudio()
    if (audioPrefs.bgmVolume === 0) {
      audio.volume = 0
      audio.pause()
    } else {
      audio.volume = audioPrefs.bgmVolume
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPrefs.bgmVolume])

  const triggerSolve = useCallback(() => {
    if (celebrating) return
    setCelebrating(true)
    setSolvedCount((n) => n + 1)
    playSfxSuccess()
    const ms = prefersReducedMotion ? 0 : 900
    if (solveTimerRef.current !== null) {
      window.clearTimeout(solveTimerRef.current)
    }
    solveTimerRef.current = window.setTimeout(() => {
      solveTimerRef.current = null
      setCelebrating(false)
      void startNewRound()
    }, ms)
  }, [celebrating, prefersReducedMotion, startNewRound])

  useEffect(() => {
    if (!round || !attempt) return
    const correct = fractionEqualsInt(attempt.value, round.target)
    if (!correct) return
    triggerSolve()
  }, [attempt, round, triggerSolve])

  useEffect(() => {
    if (!DEV_CHEAT) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'i') return
      if (!round) return
      // DEV_CHEAT: press "i" to auto-solve the current puzzle.
      triggerSolve()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [DEV_CHEAT, triggerSolve, round])

  useEffect(() => {
    return () => {
      if (solveTimerRef.current !== null) {
        window.clearTimeout(solveTimerRef.current)
      }
    }
  }, [])

  function onAnyUserGesture(): void {
    if (audioPrefs.bgmVolume > 0) void tryPlayAudio()
    if (audioPrefs.sfxVolume > 0) {
      const ctx = ensureSfxContext()
      if (ctx.state === 'suspended') void ctx.resume()
    }
  }

  function onBgmVolumeChange(v: number): void {
    onAnyUserGesture()
    setBgmVolume(v)
    const audio = ensureAudio()
    audio.volume = clamp01(v)
    if (v > 0) void tryPlayAudio()
  }

  function onSfxVolumeChange(v: number): void {
    onAnyUserGesture()
    setSfxVolume(v)
  }

  return (
    <div
      className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--text)]"
      onPointerDownCapture={onAnyUserGesture}
    >
      <div className="mx-auto max-w-4xl px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <Card className="bg-[color:var(--surface-2)] p-3 sm:p-4">
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="flex justify-start">
              <IconButton
                onClick={resetSolved}
                disabled={celebrating}
                aria-label="Reset"
                className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--neutral)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v6h6" />
                </svg>
              </IconButton>
            </div>

            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--neutral)] shadow-sm shadow-black/5">
                ✓
                <motion.span
                  key={solvedCount}
                  initial={{ scale: 0.9, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="tabular-nums text-sm font-semibold text-[color:var(--text)]"
                >
                  {solvedCount}
                </motion.span>
              </div>
            </div>

            <div className="relative flex items-center justify-end gap-2">
              <GhostButton onClick={startNewRound} disabled={loadingRound || celebrating}>
                ↻
              </GhostButton>
              <IconButton
                aria-label="Audio"
                onClick={() => setAudioPanelOpen((v) => !v)}
                disabled={celebrating}
                className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--neutral)]"
              >
                <VolumeIcon className="h-5 w-5" />
              </IconButton>

              {audioPanelOpen ? (
                <div className="absolute right-0 top-12 z-20 w-52">
                  <Card className="bg-[color:var(--surface)] p-3">
                    <div className="flex items-center justify-between gap-2">
                    </div>

                    <div className="mt-3">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={audioPrefs.bgmVolume}
                        onChange={(e) => onBgmVolumeChange(Number(e.target.value))}
                        className="w-full accent-[color:var(--accent)]"
                      />
                    </div>
                    <div className="mt-3">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={audioPrefs.sfxVolume}
                        onChange={(e) => onSfxVolumeChange(Number(e.target.value))}
                        className="w-full accent-[color:var(--accent)]"
                      />
                    </div>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <motion.div
              animate={
                celebrating && !prefersReducedMotion
                  ? { x: [-2, 2, -2, 2, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.35 }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {([0, 1, 2, 3, 4] as const).map((i) => {
                  const isNum = isNumberSlot(i)
                  const isOp = isOpSlot(i)
                  const filledNumberId = isNum ? slots[i] : null
                  const filledOp = isOp ? slots[i] : null
                  const highlight =
                    draggingType === 'number'
                      ? isNum && filledNumberId === null
                      : draggingType === 'op'
                        ? isOp && filledOp === null
                        : false

                  const content =
                    isNum && filledNumberId ? numberById.get(filledNumberId)?.value : undefined

                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        slotRefs.current[i] = el
                      }}
                      className={classNames(
                        'grid h-14 w-14 place-items-center border border-dashed border-[color:var(--border)] bg-[color:var(--surface-2)] shadow-sm shadow-black/5 transition',
                        isNum ? 'rounded-2xl' : 'rounded-full',
                        highlight && 'border-[color:var(--accent)] bg-[color:var(--surface)]',
                        celebrating && 'border-[color:var(--success)] bg-[color:var(--success)]/20',
                      )}
                    >
                      {isNum && filledNumberId ? (
                        <motion.div
                          drag={canDrag}
                          dragMomentum={false}
                          whileDrag={{
                            scale: 1.08,
                            boxShadow: '0 14px 32px rgba(24, 24, 27, 0.18)',
                          }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                          onDragStart={() => setDraggingType('number')}
                          onDragEnd={(_, info) => {
                            setDraggingType(null)
                            if (!canDrag) return
                            const originSlot: 0 | 2 | 4 = i as 0 | 2 | 4
                            const point = { x: info.point.x, y: info.point.y }
                            const drop = findDropSlot(point)
                            if (drop !== null && isNumberSlot(drop)) {
                              moveNumber(filledNumberId, originSlot, drop)
                              playSfxClick()
                            } else if (droppedInTray(point)) {
                              setSlots((prev) => ({ ...prev, [originSlot]: null }))
                            } else {
                              // revert to origin (no-op)
                            }
                          }}
                          className={classNames(
                            tileBaseClasses('number'),
                            'grid h-11 w-11 place-items-center font-semibold tabular-nums',
                            tileTextClass,
                          )}
                        >
                          {content}
                        </motion.div>
                      ) : null}

                      {isOp && filledOp ? (
                        <motion.div
                          drag={canDrag}
                          dragMomentum={false}
                          whileDrag={{
                            scale: 1.08,
                            boxShadow: '0 14px 32px rgba(24, 24, 27, 0.18)',
                          }}
                          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                          onDragStart={() => setDraggingType('op')}
                          onDragEnd={(_, info) => {
                            setDraggingType(null)
                            if (!canDrag) return
                            const originSlot: 1 | 3 = i as 1 | 3
                            const point = { x: info.point.x, y: info.point.y }
                            const drop = findDropSlot(point)
                            if (drop !== null && isOpSlot(drop)) {
                              moveOp(filledOp, originSlot, drop)
                              playSfxClick()
                            } else if (droppedInTray(point)) {
                              setOp(originSlot, null, true)
                            } else {
                              // revert (no-op)
                            }
                          }}
                          className={classNames(
                            tileBaseClasses('op'),
                            'grid h-11 w-11 place-items-center font-semibold',
                            tileTextClass,
                          )}
                        >
                          {formatOp(filledOp)}
                        </motion.div>
                      ) : null}

                      {!filledNumberId && !filledOp ? (
                        <div className="text-[10px] font-semibold text-[color:var(--neutral)] opacity-60">
                          {isNum ? '□' : '○'}
                        </div>
                      ) : null}
                    </div>
                  )
                })}

                <div className="ml-1 flex items-center">
                  <div className="flex h-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3">
                    <div className={classNames('font-semibold tabular-nums text-[color:var(--text)]', tileTextClass)}>
                      {round ? round.target : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {loadError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}

          <div
            ref={trayRef}
            className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-sm shadow-black/5 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-[color:var(--neutral)]">●</div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {(round?.numbers ?? []).map((t) => {
                const placed = slots[0] === t.id || slots[2] === t.id || slots[4] === t.id
                return (
                  <motion.div
                    key={t.id}
                    drag={canDrag}
                    dragMomentum={false}
                    whileDrag={{
                      scale: 1.08,
                      boxShadow: '0 16px 34px rgba(24, 24, 27, 0.2)',
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    onDragStart={() => setDraggingType('number')}
                    onDragEnd={(_, info) => {
                      setDraggingType(null)
                      if (!canDrag) return
                      const point = { x: info.point.x, y: info.point.y }
                      const drop = findDropSlot(point)
                      if (drop !== null && isNumberSlot(drop) && slots[drop] === null) {
                        placeNumber(t.id, drop, false)
                        playSfxClick()
                      }
                    }}
                    className={classNames(
                      tileBaseClasses('number'),
                      'grid h-14 w-14 place-items-center text-xl font-semibold tabular-nums',
                      placed && 'invisible',
                    )}
                  >
                    {t.value}
                  </motion.div>
                )
              })}

              <div className="h-14 w-px bg-[color:var(--border)]" />

              {operatorTiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  drag={canDrag}
                  dragMomentum={false}
                  whileDrag={{
                    scale: 1.08,
                    boxShadow: '0 16px 34px rgba(24, 24, 27, 0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  onDragStart={() => setDraggingType('op')}
                  onDragEnd={(_, info) => {
                    setDraggingType(null)
                    if (!canDrag) return
                    const point = { x: info.point.x, y: info.point.y }
                    const drop = findDropSlot(point)
                    if (drop !== null && isOpSlot(drop) && slots[drop] === null) {
                      setOp(drop, tile.op, false)
                      replaceOperatorTile(tile.id, tile.op)
                      playSfxClick()
                    }
                  }}
                  className={classNames(
                    tileBaseClasses('op'),
                    'grid h-14 w-14 place-items-center text-xl font-semibold',
                  )}
                >
                  {formatOp(tile.op)}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2" />
        </Card>
      </div>
    </div>
  )
}
