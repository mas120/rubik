import { useCallback, useEffect, useRef, useState } from 'react'
import { CubeCanvas, type CubeCanvasHandle } from '../components/CubeCanvas'
import { getModel, toHomeOrientation, type Cube, type CubeModel } from '../core'
import { loadFree, loadFree4, loadFreeSize, saveFree, saveFree4, saveFreeSize } from '../storage'

const TURN_MS = 180

type Size = 3 | 4

interface BoardState {
  cube: Cube
  history: string[]
}

type Job =
  | { kind: 'move'; move: string; before: Cube; after: Cube; ms: number }
  | { kind: 'set'; cube: Cube }

interface BoardProps {
  model: CubeModel
  initial: BoardState
  persist: boolean
  onChange(state: BoardState): void
  onTeach(n: 3 | 4, cube: Cube): void
}

function Board({ model, initial, persist, onChange, onTeach }: BoardProps) {
  const [cube, setCube] = useState<Cube>(initial.cube)
  const [history, setHistory] = useState<string[]>(initial.history)
  const [scrambling, setScrambling] = useState(false)
  const canvas = useRef<CubeCanvasHandle>(null)
  const cubeRef = useRef<Cube>(cube)
  const historyRef = useRef<string[]>(history)
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
    (move: string, after: Cube, nextHistory: string[], ms: number) => {
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
    (move: string, ms: number) => {
      commit(move, model.apply(cubeRef.current, move), [...historyRef.current, move], ms)
    },
    [commit, model],
  )

  useEffect(() => {
    const handle = canvas.current
    handle?.setInteractive((move) => turn(move, TURN_MS))
    return () => handle?.setInteractive(null)
  }, [turn])

  useEffect(() => {
    onChange({ cube, history })
    if (!persist) return
    if (model.n === 3) saveFree(cube, history)
    else saveFree4(cube, history)
  }, [cube, history, persist, model, onChange])

  const scramble = () => {
    setScrambling(true)
    const ms = model.n === 3 ? 70 : 50
    const length = model.n === 3 ? 20 : 40
    for (const move of model.scramble(length, Math.random)) turn(move, ms)
  }

  const undo = () => {
    const last = historyRef.current.at(-1)
    if (!last) return
    const inverse = model.invert(last)
    commit(inverse, model.apply(cubeRef.current, inverse), historyRef.current.slice(0, -1), TURN_MS)
  }

  const reset = () => {
    queue.current.length = 0
    cubeRef.current = model.solved
    historyRef.current = []
    setCube(model.solved)
    setHistory([])
    queue.current.push({ kind: 'set', cube: model.solved })
    void pump()
  }

  const solved = model.isSolved(cube)

  return (
    <>
      <div className="canvas-wrap">
        <CubeCanvas ref={canvas} model={model} initial={cube} />
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
        {model.n === 3 ? (
          <button
            className="btn primary wide"
            disabled={scrambling || solved}
            onClick={() => onTeach(3, toHomeOrientation(cubeRef.current).cube)}
          >
            Dạy tôi giải từ đây
          </button>
        ) : (
          <button
            className="btn primary wide"
            disabled={scrambling || solved}
            onClick={() => onTeach(4, cubeRef.current)}
          >
            Dạy tôi giải từ đây
          </button>
        )}
      </footer>
    </>
  )
}

interface Props {
  persist: boolean
  initialSize?: Size
  onHome(): void
  onTeach(n: 3 | 4, cube: Cube): void
}

export function FreePlay({ persist, initialSize, onHome, onTeach }: Props) {
  const [size, setSize] = useState<Size>(() => initialSize ?? (persist ? loadFreeSize() : 3))
  const [store, setStore] = useState<Record<Size, BoardState>>(() => {
    const model3 = getModel(3)
    const model4 = getModel(4)
    const saved3 = persist ? loadFree() : null
    const saved4 = persist ? loadFree4() : null
    return {
      3: saved3 ?? { cube: model3.solved, history: [] },
      4: saved4 ?? { cube: model4.solved, history: [] },
    }
  })

  const choose = (next: Size) => {
    if (persist) saveFreeSize(next)
    setSize(next)
  }

  const record = useCallback(
    (state: BoardState) => {
      setStore((previous) => ({ ...previous, [size]: state }))
    },
    [size],
  )

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

      <div className="segmented" role="radiogroup">
        {([3, 4] as const).map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={size === option}
            className={`seg${size === option ? ' active' : ''}`}
            onClick={() => choose(option)}
          >
            {option}×{option}
          </button>
        ))}
      </div>

      <Board
        key={size}
        model={getModel(size)}
        initial={store[size]}
        persist={persist}
        onChange={record}
        onTeach={onTeach}
      />
    </main>
  )
}
