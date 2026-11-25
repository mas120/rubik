import { useEffect, useMemo, useRef, useState } from 'react'
import { CubeCanvas, type CubeCanvasHandle } from '../components/CubeCanvas'
import { getModel, toHomeOrientation, type Cube } from '../core'
import {
  buildItems,
  buildPlan3,
  buildPlan4,
  cubeAt,
  describeMove,
  focusAt,
  fullStageKeys,
  type LessonPlan,
} from '../lesson/plan'
import { applyUserMove, isHalfTurnPartial } from '../lesson/track'
import { DRAG_HINT, HALF_TURN_MESSAGE, SETUP_HINT, offTrackMessage } from '../lesson/texts'
import { saveLesson } from '../storage'

const MOVE_MS = 350
const DRAG_MS = 180

interface Props {
  n: 3 | 4
  cube: Cube
  initialCursor: number
  initialExtra: string[]
  persist: boolean
  onHome(): void
  onFinish(): void
  onRestart(cube: Cube): void
  onReenter(cube: Cube): void
}

interface WakeLockSentinelLike {
  release(): Promise<void>
}

export function Lesson(props: Props) {
  const { n, cube, onHome } = props
  const [plan, setPlan] = useState<LessonPlan | null>(() => (n === 3 ? buildPlan3(cube) : null))

  useEffect(() => {
    if (n === 3) return
    const timer = window.setTimeout(() => setPlan(buildPlan4(cube)), 30)
    return () => window.clearTimeout(timer)
  }, [n, cube])

  if (!plan) {
    return (
      <main className="screen lesson">
        <header className="topbar">
          <div className="topbar-row">
            <div className="topbar-title">
              <strong>Bài học 4×4</strong>
            </div>
            <button className="btn small" onClick={onHome}>
              Về trang đầu
            </button>
          </div>
        </header>
        <p className="loading-line">Đang tính lời giải…</p>
      </main>
    )
  }
  return <LessonBody {...props} plan={plan} />
}

function LessonBody({
  plan,
  n,
  cube,
  initialCursor,
  initialExtra,
  persist,
  onHome,
  onFinish,
  onRestart,
  onReenter,
}: Props & { plan: LessonPlan }) {
  const model = useMemo(() => getModel(n), [n])
  const items = useMemo(() => buildItems(plan), [plan])
  const [cursor, setCursor] = useState(() => Math.max(0, Math.min(initialCursor, items.length - 1)))
  const [extra, setExtra] = useState<string[]>(initialExtra)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const canvas = useRef<CubeCanvasHandle>(null)
  const busyRef = useRef(false)

  const item = items[cursor]
  const current = useMemo(() => cubeAt(plan, items, cursor), [plan, items, cursor])
  const step = item.type === 'move' ? plan.steps[item.stepIndex] : null
  const highlight = useMemo(() => {
    const focus = focusAt(plan, items, cursor)
    return focus.length > 0 ? focus : null
  }, [plan, items, cursor])

  const offTrack = extra.length > 0
  const displayed = useMemo(() => model.applyAll(current, extra), [model, current, extra])
  const handleUserMove = useRef<(move: string) => void>(() => undefined)

  useEffect(() => {
    canvas.current?.setState(displayed, offTrack ? null : highlight)
  }, [displayed, highlight, offTrack])

  useEffect(() => {
    canvas.current?.setArrows(item.type === 'move' && !busy && !offTrack ? item.move : null)
  }, [item, busy, offTrack])

  useEffect(() => {
    const handle = canvas.current
    handle?.setInteractive(item.type === 'move' ? (move) => handleUserMove.current(move) : null)
    return () => handle?.setInteractive(null)
  }, [item.type])

  useEffect(() => {
    if (persist) saveLesson(n, cube, cursor, extra)
  }, [n, cube, cursor, extra, persist])

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
        await canvas.current?.animateMove(item.move, current, cubeAt(plan, items, cursor + 1), MOVE_MS)
      }
      setCursor(cursor + 1)
    })

  const back = () =>
    run(async () => {
      if (cursor === 0) return
      const previous = items[cursor - 1]
      if (previous.type === 'move') {
        await canvas.current?.animateMove(
          model.invert(previous.move),
          current,
          cubeAt(plan, items, cursor - 1),
          MOVE_MS,
        )
      }
      setCursor(cursor - 1)
    })

  const onUserMove = (move: string) => {
    if (busyRef.current || item.type !== 'move') return
    const nextCube = cubeAt(plan, items, cursor + 1)
    const result = applyUserMove(model, current, nextCube, extra, move)
    void run(async () => {
      await canvas.current?.animateMove(move, displayed, model.apply(displayed, move), DRAG_MS)
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
      const inverse = model.invert(last)
      await canvas.current?.animateMove(inverse, displayed, model.apply(displayed, inverse), DRAG_MS)
      setExtra(extra.slice(0, -1))
    })

  const continueFromHere = () => {
    if (model.isSolved(displayed)) onFinish()
    else onRestart(n === 3 ? toHomeOrientation(displayed).cube : displayed)
  }

  const replay = () =>
    run(async () => {
      if (item.type !== 'move') return
      await canvas.current?.animateMove(item.move, current, cubeAt(plan, items, cursor + 1), MOVE_MS)
      canvas.current?.setState(current, highlight)
    })

  const stageKey: string | null =
    item.type === 'intro' ? item.stage : step ? step.stage : (plan.steps.at(-1)?.stage ?? null)
  const stageKeys = fullStageKeys(n)
  const stageInfo = plan.stages.find((entry) => entry.key === stageKey) ?? null
  const stageNumber = stageKey ? stageKeys.indexOf(stageKey) + 1 : stageKeys.length
  const title = item.type === 'done' ? 'Hoàn thành' : (stageInfo?.title ?? '')

  const phaseRank = { setup: 0, alg: 1, cleanup: 2 } as const
  const chipClass = (phase: 'setup' | 'alg' | 'cleanup', index: number) => {
    if (item.type !== 'move') return 'chip'
    if (item.phase === phase && item.indexInPhase === index) return 'chip current'
    const done =
      phaseRank[phase] < phaseRank[item.phase] || (item.phase === phase && index < item.indexInPhase)
    return done ? 'chip done' : 'chip'
  }

  return (
    <main className="screen lesson">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-title">
            <strong>{title}</strong>
            <span>
              Giai đoạn {stageNumber}/{stageKeys.length}
            </span>
          </div>
          <button className="icon-btn" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="menu">
              {n === 3 && (
                <button className="btn" onClick={() => onReenter(toHomeOrientation(displayed).cube)}>
                  Nhập lại khối
                </button>
              )}
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
        <CubeCanvas ref={canvas} model={model} initial={displayed} initialHighlight={offTrack ? null : highlight} />
        <button className="btn small reset-view" onClick={() => canvas.current?.resetCamera()}>
          Đặt lại góc nhìn
        </button>
      </div>

      <section className="panel">
        <div className="panel-body">
          {item.type === 'intro' && stageInfo && (
            <>
              <h2>{stageInfo.title}</h2>
              <p>{stageInfo.goal}</p>
              {stageInfo.algs.length > 0 && (
                <ul className="algs">
                  {stageInfo.algs.map((alg) => (
                    <li key={alg.name}>
                      {alg.name} : <code>{alg.notation}</code>
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
              <p className="explain">{step.explain}</p>
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
                  <span className="chip-label">{step.algLabel ?? 'Thực hiện'}</span>
                  {step.alg.map((m, i) => (
                    <span key={i} className={chipClass('alg', i)}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {step.cleanup.length > 0 && (
                <div className="chip-row">
                  <span className="chip-label">Trả lại</span>
                  {step.cleanup.map((m, i) => (
                    <span key={i} className={chipClass('cleanup', i)}>
                      {m}
                    </span>
                  ))}
                </div>
              )}
              <p className="move-desc">{describeMove(n, item.move)}</p>
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
