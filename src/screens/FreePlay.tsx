import { useCallback, useEffect, useRef, useState } from 'react'
import { CubeCanvas, type CubeCanvasHandle } from '../components/CubeCanvas'
import {
  SOLVED,
  applyMove,
  invertMove,
  isSolved,
  randomScramble,
  toHomeOrientation,
  type Cube,
  type Move,
} from '../core'
import { loadFree, saveFree } from '../storage'

const TURN_MS = 180
const SCRAMBLE_MS = 70

type Job = { kind: 'move'; move: Move; before: Cube; after: Cube; ms: number } | { kind: 'set'; cube: Cube }

interface Props {
  persist: boolean
  onHome(): void
  onTeach(cube: Cube): void
}

export function FreePlay({ persist, onHome, onTeach }: Props) {
  const [initial] = useState(() => (persist ? loadFree() : null))
  const [cube, setCube] = useState<Cube>(initial?.cube ?? SOLVED)
  const [history, setHistory] = useState<Move[]>(initial?.history ?? [])
  const [scrambling, setScrambling] = useState(false)
  const canvas = useRef<CubeCanvasHandle>(null)
  const cubeRef = useRef<Cube>(cube)
  const historyRef = useRef<Move[]>(history)
  const queue = useRef<Job[]>([])
  const running = useRef(false)

  const pump = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length > 0) {
      const job = queue.current.shift()!
      if (job.kind === 'set') canvas.current?.setState(job.cube, null)
      else await canvas.current?.animateMove(job.move, job.before, job.after, job.ms)
    }
    running.current = false
    setScrambling(false)
  }, [])

  const commit = useCallback(
    (move: Move, after: Cube, nextHistory: Move[], ms: number) => {
      const before = cubeRef.current
      cubeRef.current = after
      historyRef.current = nextHistory
      setCube(after)
      setHistory(nextHistory)
      queue.current.push({ kind: 'move', move, before, after, ms })
      void pump()
    },
    [pump],
  )

  const turn = useCallback(
    (move: Move, ms: number) => {
      commit(move, applyMove(cubeRef.current, move), [...historyRef.current, move], ms)
    },
    [commit],
  )

  useEffect(() => {
    const handle = canvas.current
    handle?.setInteractive((move) => turn(move, TURN_MS))
    return () => handle?.setInteractive(null)
  }, [turn])

  useEffect(() => {
    if (persist) saveFree(cube, history)
  }, [cube, history, persist])

  const scramble = () => {
    setScrambling(true)
    for (const move of randomScramble(20, Math.random)) turn(move, SCRAMBLE_MS)
  }

  const undo = () => {
    const last = historyRef.current.at(-1)
    if (!last) return
    const inverse = invertMove(last)
    commit(inverse, applyMove(cubeRef.current, inverse), historyRef.current.slice(0, -1), TURN_MS)
  }

  const reset = () => {
    queue.current.length = 0
    cubeRef.current = SOLVED
    historyRef.current = []
    setCube(SOLVED)
    setHistory([])
    queue.current.push({ kind: 'set', cube: SOLVED })
    void pump()
  }

  const solved = isSolved(cube)

  return (
    <main className="screen free">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-title">
            <strong>Xoay tự do</strong>
          </div>
          <button className="btn small" onClick={onHome}>
            Về trang đầu
          </button>
        </div>
      </header>

      <div className="canvas-wrap">
        <CubeCanvas ref={canvas} initial={cube} />
        <button className="btn small reset-view" onClick={() => canvas.current?.resetCamera()}>
          Đặt lại góc nhìn
        </button>
      </div>

      <p className="hint-line">Kéo trên một mặt để xoay tầng đó. Kéo ở vùng trống để đổi góc nhìn.</p>
      <p className="status-line">{solved ? 'Đã giải xong' : `Đã xoay ${history.length} nước`}</p>

      <footer className="free-buttons">
        <button className="btn" disabled={scrambling} onClick={scramble}>
          Xáo trộn
        </button>
        <button className="btn" disabled={scrambling || history.length === 0} onClick={undo}>
          Hoàn tác
        </button>
        <button className="btn" disabled={scrambling} onClick={reset}>
          Đặt lại
        </button>
        <button
          className="btn primary wide"
          disabled={scrambling || solved}
          onClick={() => onTeach(toHomeOrientation(cubeRef.current).cube)}
        >
          Dạy tôi giải từ đây
        </button>
      </footer>
    </main>
  )
}
