import { useEffect, useMemo, useRef, useState } from 'react'
import { CubeCanvas, type CubeCanvasHandle } from '../components/CubeCanvas'
import {
  ALGS,
  applyMove,
  applyMoves,
  formatMoves,
  getModel,
  invertMove,
  isSolved,
  locatePiece,
  solve,
  toHomeOrientation,
  type Cube,
  type Move,
  type StageId,
} from '../core'
import { buildLesson, cubeAt } from '../lesson/lesson'
import { applyUserMove, isHalfTurnPartial } from '../lesson/track'
import {
  ALG_NAME,
  DRAG_HINT,
  HALF_TURN_MESSAGE,
  MOVE_DESC,
  STAGE_ALGS,
  STAGE_ORDER,
  STAGE_TEXT,
  SETUP_HINT,
  explainStep,
  offTrackMessage,
} from '../lesson/texts'
import { saveLesson } from '../storage'

const MODEL = getModel(3)
const MOVE_MS = 350
const DRAG_MS = 180

interface Props {
  cube: Cube
  initialCursor: number
  initialExtra: Move[]
  persist: boolean
  onHome(): void
  onFinish(): void
  onRestart(cube: Cube): void
  onReenter(cube: Cube): void
}

interface WakeLockSentinelLike {
  release(): Promise<void>
}

export function Lesson({
  cube,
  initialCursor,
  initialExtra,
  persist,
  onHome,
  onFinish,
  onRestart,
  onReenter,
}: Props) {
  const solution = useMemo(() => solve(cube), [cube])
  const items = useMemo(() => buildLesson(solution), [solution])
  const [cursor, setCursor] = useState(() => Math.max(0, Math.min(initialCursor, items.length - 1)))
  const [extra, setExtra] = useState<Move[]>(initialExtra)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const canvas = useRef<CubeCanvasHandle>(null)
  const busyRef = useRef(false)

  const item = items[cursor]
  const current = useMemo(() => cubeAt(cube, solution, items, cursor), [cube, solution, items, cursor])
  const step = item.type === 'move' ? solution.steps[item.stepIndex] : null
  const highlight = useMemo(
    () => (step?.piece ? (locatePiece(current, step.piece)?.facelets ?? null) : null),
    [step, current],
  )

  const offTrack = extra.length > 0
  const displayed = useMemo(() => applyMoves(current, extra), [current, extra])
  const handleUserMove = useRef<(move: Move) => void>(() => undefined)

  useEffect(() => {
    canvas.current?.setState(displayed, offTrack ? null : highlight)
  }, [displayed, highlight, offTrack])

  useEffect(() => {
    canvas.current?.setArrows(item.type === 'move' && !busy && !offTrack ? item.move : null)
  }, [item, busy, offTrack])

  useEffect(() => {
    const handle = canvas.current
    handle?.setInteractive(item.type === 'move' ? (move) => handleUserMove.current(move as Move) : null)
    return () => handle?.setInteractive(null)
  }, [item.type])

  useEffect(() => {
    if (persist) saveLesson(cube, cursor, extra)
  }, [cube, cursor, extra, persist])

  useEffect(() => {
    let sentinel: WakeLockSentinelLike | null = null
    let active = true
    const wakeLock = (navigator as unknown as { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } })
      .wakeLock
    const acquire = () => {
      if (!wakeLock || document.visibilityState !== 'visible') return
      wakeLock
        .request('screen')
        .then((s) => {
          if (active) sentinel = s
          else s.release().catch(() => undefined)
        })
        .catch(() => undefined)
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', acquire)
      sentinel?.release().catch(() => undefined)
    }
  }, [])

  const run = async (action: () => Promise<void> | void) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await action()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const next = () =>
    run(async () => {
      if (item.type === 'done') return
      if (item.type === 'move') {
        await canvas.current?.animateMove(item.move, current, cubeAt(cube, solution, items, cursor + 1), MOVE_MS)
      }
      setCursor(cursor + 1)
    })

  const back = () =>
    run(async () => {
      if (cursor === 0) return
      const previous = items[cursor - 1]
      if (previous.type === 'move') {
        await canvas.current?.animateMove(
          invertMove(previous.move),
          current,
          cubeAt(cube, solution, items, cursor - 1),
          MOVE_MS,
        )
      }
      setCursor(cursor - 1)
    })

  const onUserMove = (move: Move) => {
    if (busyRef.current || item.type !== 'move') return
    const next = cubeAt(cube, solution, items, cursor + 1)
    const result = applyUserMove(current, next, extra, move)
    void run(async () => {
      await canvas.current?.animateMove(move, displayed, applyMove(displayed, move), DRAG_MS)
      if (result.advance) setCursor(cursor + 1)
      setExtra(result.extra)
    })
  }

  useEffect(() => {
    handleUserMove.current = onUserMove
  })

  const undoExtra = () =>
    run(async () => {
      const last = extra.at(-1)
      if (!last) return
      const inverse = invertMove(last)
      await canvas.current?.animateMove(inverse, displayed, applyMove(displayed, inverse), DRAG_MS)
      setExtra(extra.slice(0, -1))
    })

  const continueFromHere = () => {
    if (isSolved(displayed)) onFinish()
    else onRestart(toHomeOrientation(displayed).cube)
  }

  const replay = () =>
    run(async () => {
      if (item.type !== 'move') return
      await canvas.current?.animateMove(item.move, current, cubeAt(cube, solution, items, cursor + 1), MOVE_MS)
      canvas.current?.setState(current, highlight)
    })

  const stage: StageId | null =
    item.type === 'intro' ? item.stage : step ? step.stage : (solution.steps.at(-1)?.stage ?? null)
  const stageNumber = stage ? STAGE_ORDER.indexOf(stage) + 1 : STAGE_ORDER.length
  const title = item.type === 'done' ? 'Hoàn thành' : stage ? STAGE_TEXT[stage].title : ''

  const chipClass = (phase: 'setup' | 'alg', index: number) => {
    if (item.type !== 'move') return 'chip'
    if (item.phase === phase && item.indexInPhase === index) return 'chip current'
    const done = phase === 'setup' ? item.phase === 'alg' || index < item.indexInPhase : item.phase === 'alg' && index < item.indexInPhase
    return done ? 'chip done' : 'chip'
  }

  return (
    <main className="screen lesson">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-title">
            <strong>{title}</strong>
            <span>
              Giai đoạn {stageNumber}/{STAGE_ORDER.length}
            </span>
          </div>
          <button className="icon-btn" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="menu">
              <button className="btn" onClick={() => onReenter(toHomeOrientation(displayed).cube)}>
                Nhập lại khối
              </button>
              <button className="btn" onClick={onHome}>
                Về trang đầu
              </button>
            </div>
          )}
        </div>
        <div className="progress">
          <div style={{ width: `${(cursor / Math.max(1, items.length - 1)) * 100}%` }} />
        </div>
      </header>

      <div className="canvas-wrap">
        <CubeCanvas ref={canvas} model={MODEL} initial={displayed} initialHighlight={offTrack ? null : highlight} />
        <button className="btn small reset-view" onClick={() => canvas.current?.resetCamera()}>
          Đặt lại góc nhìn
        </button>
      </div>

      <section className="panel">
        <div className="panel-body">
          {item.type === 'intro' && (
            <>
              <h2>{STAGE_TEXT[item.stage].title}</h2>
              <p>{STAGE_TEXT[item.stage].goal}</p>
              {STAGE_ALGS[item.stage].length > 0 && (
                <ul className="algs">
                  {STAGE_ALGS[item.stage].map((id) => (
                    <li key={id}>
                      {ALG_NAME[id]} : <code>{formatMoves(ALGS[id])}</code>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {item.type === 'move' && step && offTrack && (
            <p className="explain">
              {isHalfTurnPartial(item.move, extra) ? HALF_TURN_MESSAGE : offTrackMessage(extra.length)}
            </p>
          )}
          {item.type === 'move' && step && !offTrack && (
            <>
              <p className="explain">{explainStep(step)}</p>
              {item.phase === 'setup' && <p className="hint">{SETUP_HINT}</p>}
              {step.setup.length > 0 && (
                <div className="chip-row">
                  <span className="chip-label">Chuẩn bị</span>
                  {step.setup.map((m, i) => (
                    <span key={i} className={chipClass('setup', i)}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {step.alg.length > 0 && (
                <div className="chip-row">
                  <span className="chip-label">
                    {step.algId ? `${ALG_NAME[step.algId]} × ${step.repeat}` : 'Thực hiện'}
                  </span>
                  {step.alg.map((m, i) => (
                    <span key={i} className={chipClass('alg', i)}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              <p className="move-desc">{MOVE_DESC[item.move]}</p>
              {item.stepIndex === 0 && <p className="hint">{DRAG_HINT}</p>}
            </>
          )}
          {item.type === 'done' && (
            <>
              <h2>Hoàn thành!</h2>
              <p>Bạn đã giải xong khối Rubik.</p>
            </>
          )}
        </div>

        <footer className="buttons">
          {offTrack ? (
            <>
              <button className="btn" disabled={busy} onClick={undoExtra}>
                Hoàn tác
              </button>
              <button className="btn primary" disabled={busy} onClick={continueFromHere}>
                Giải tiếp từ đây
              </button>
            </>
          ) : item.type === 'done' ? (
            <>
              <button className="btn" disabled={busy || cursor === 0} onClick={back}>
                Lùi
              </button>
              <button className="btn primary" onClick={onFinish}>
                Giải khối khác
              </button>
            </>
          ) : (
            <>
              <button className="btn" disabled={busy || cursor === 0} onClick={back}>
                Lùi
              </button>
              {item.type === 'move' && (
                <button className="btn" disabled={busy} onClick={replay}>
                  Xem lại
                </button>
              )}
              {item.type === 'intro' ? (
                <button className="btn primary" disabled={busy} onClick={next}>
                  Bắt đầu giai đoạn
                </button>
              ) : (
                <button className="btn primary" disabled={busy} onClick={next}>
                  Tiếp
                </button>
              )}
            </>
          )}
        </footer>
      </section>
    </main>
  )
}
