import { useMemo, useRef, useState } from 'react'
import { CubeCanvas, type CubeCanvasHandle } from '../components/CubeCanvas'
import { getModel, type Cube } from '../core'
import { basicsPages, type BasicsBlock } from '../lesson/basics'
import { moveInstruction } from '../lesson/guide'
import { describeMove } from '../lesson/plan'

const DEMO_MS = 350

function Demo({ n, moves }: { n: 3 | 4; moves: string[] }) {
  const model = useMemo(() => getModel(n), [n])
  const canvas = useRef<CubeCanvasHandle>(null)
  const [cube, setCube] = useState<Cube>(model.solved)
  const [last, setLast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const play = async (move: string) => {
    if (busy) return
    setBusy(true)
    const after = model.apply(cube, move)
    setLast(move)
    await canvas.current?.animateMove(move, cube, after, DEMO_MS)
    setCube(after)
    setBusy(false)
  }

  const reset = () => {
    if (busy) return
    canvas.current?.setState(model.solved, null)
    setCube(model.solved)
    setLast(null)
  }

  return (
    <div className="basics-demo">
      <div className="basics-canvas">
        <CubeCanvas ref={canvas} model={model} initial={model.solved} />
      </div>
      <div className="basics-moves">
        {moves.map((move) => (
          <button key={move} className={`chip${move === last ? ' current' : ''}`} disabled={busy} onClick={() => play(move)}>
            {move}
          </button>
        ))}
        <button className="btn small" disabled={busy} onClick={reset}>
          Đặt lại khối
        </button>
      </div>
      {last ? (
        <>
          <p className="move-desc">{describeMove(n, last)}</p>
          <p className="move-how">{moveInstruction(last)}</p>
        </>
      ) : (
        <p className="hint">Bấm một ký hiệu để xem.</p>
      )}
    </div>
  )
}

function Block({ n, block }: { n: 3 | 4; block: BasicsBlock }) {
  if ('p' in block) return <p>{block.p}</p>
  if ('ul' in block) {
    return (
      <ul>
        {block.ul.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  return <Demo n={n} moves={block.demo} />
}

interface Props {
  n: 3 | 4
  finishLabel: string
  onFinish(): void
  onSkip(): void
}

export function Basics({ n, finishLabel, onFinish, onSkip }: Props) {
  const pages = useMemo(() => basicsPages(n), [n])
  const [page, setPage] = useState(0)
  const current = pages[page]
  const last = page === pages.length - 1

  return (
    <main className="screen basics">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-title">
            <strong>
              Hướng dẫn cơ bản — {page + 1}/{pages.length}
            </strong>
          </div>
          {page > 0 && (
            <button className="btn small" onClick={onSkip}>
              Bỏ qua
            </button>
          )}
        </div>
        <div className="progress">
          <div style={{ width: `${((page + 1) / pages.length) * 100}%` }} />
        </div>
      </header>

      <div className="basics-body" key={page}>
        <h2>{current.title}</h2>
        {current.blocks.map((block, i) => (
          <Block key={i} n={n} block={block} />
        ))}
      </div>

      <footer className="buttons">
        <button className="btn" onClick={() => (page === 0 ? onSkip() : setPage(page - 1))}>
          {page === 0 ? 'Bỏ qua' : 'Lùi'}
        </button>
        <button className="btn primary" onClick={() => (last ? onFinish() : setPage(page + 1))}>
          {last ? finishLabel : 'Tiếp'}
        </button>
      </footer>
    </main>
  )
}
