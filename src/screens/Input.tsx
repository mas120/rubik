import { useEffect, useState } from 'react'
import { CameraScanner } from '../components/CameraScanner'
import { COLOUR_HEX, COLOUR_NAME } from '../colors'
import { FACES, getModel, isSolved, validate, validate4, type Cube, type Face } from '../core'
import { validationMessage } from '../lesson/texts'
import { FACE_NAME4, INSTRUCTIONS4, validationMessage4 } from '../lesson/texts4'
import { SCAN_HOLD, SCAN_HOLD4, scanSteps } from '../scan/texts'
import { loadDraft, loadDraft4, saveDraft, saveDraft4 } from '../storage'

const ORDER: readonly Face[] = ['F', 'R', 'B', 'L', 'U', 'D']

const INSTRUCTIONS: Record<Face, string> = {
  F: 'Cầm khối với tâm vàng ở trên và tâm xanh lá hướng về bạn. Nhập mặt xanh lá.',
  R: 'Giữ vàng ở trên, xoay khối để mặt cam hướng về bạn.',
  B: 'Giữ vàng ở trên, xoay tiếp để mặt xanh dương hướng về bạn.',
  L: 'Giữ vàng ở trên, xoay tiếp để mặt đỏ hướng về bạn.',
  U: 'Quay về tư thế ban đầu (vàng trên, xanh lá trước mặt), rồi nghiêng khối về phía bạn để nhìn thẳng vào mặt vàng — mặt xanh lá nằm phía dưới.',
  D: 'Từ tư thế ban đầu, ngửa khối ra sau để nhìn thẳng vào mặt trắng — mặt xanh lá nằm phía trên.',
}

const NET_POSITION: Record<Face, [number, number]> = {
  U: [1, 2],
  L: [2, 1],
  F: [2, 2],
  R: [2, 3],
  B: [2, 4],
  D: [3, 2],
}

const SOLVED_MESSAGE = 'Khối này đã được giải xong rồi!'

function initialCells(n: 3 | 4, prefill: Cube | undefined, persist: boolean): (Face | null)[] {
  if (prefill) return [...prefill]
  const draft = persist ? (n === 3 ? loadDraft() : loadDraft4()) : null
  const cells: (Face | null)[] = draft ?? Array<Face | null>(6 * n * n).fill(null)
  if (n === 3) {
    FACES.forEach((f, i) => {
      cells[i * 9 + 4] = f
    })
  }
  return cells
}

interface Props {
  n: 3 | 4
  prefill?: Cube
  persist: boolean
  onBack(): void
  onStart(cube: Cube): void
}

export function Input({ n, prefill, persist, onBack, onStart }: Props) {
  const per = n * n
  const [cells, setCells] = useState(() => initialCells(n, prefill, persist))
  const [faceIndex, setFaceIndex] = useState(0)
  const [selected, setSelected] = useState<Face>('F')
  const [messages, setMessages] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    if (!persist || prefill) return
    if (n === 3) saveDraft(cells)
    else saveDraft4(cells)
  }, [cells, persist, prefill, n])

  const face = ORDER[faceIndex]
  const base = FACES.indexOf(face) * per
  const remaining = (colour: Face) => per - cells.filter((c) => c === colour).length
  const faceFull = cells.slice(base, base + per).every((c) => c !== null)
  const last = faceIndex === ORDER.length - 1
  const title =
    n === 3 ? `Mặt ${faceIndex + 1}/6 — tâm ${COLOUR_NAME[face]}` : `Mặt ${faceIndex + 1}/6 — ${FACE_NAME4[face]}`

  const paint = (offset: number) => {
    if (n === 3 && offset === 4) return
    const index = base + offset
    setMessages([])
    setCells((prev) => {
      const next = [...prev]
      if (prev[index] === selected) next[index] = null
      else if (per - prev.filter((c) => c === selected).length > 0) next[index] = selected
      return next
    })
  }

  const applyScan = (colours: Face[]) => {
    setMessages([])
    setCells((prev) => {
      const next = [...prev]
      colours.forEach((colour, offset) => {
        if (n === 3 && offset === 4) return
        next[base + offset] = colour
      })
      return next
    })
    if (last) setScanning(false)
    else setFaceIndex(faceIndex + 1)
  }

  const jump = (target: Face) => {
    setMessages([])
    setFaceIndex(ORDER.indexOf(target))
  }

  const submit = () => {
    const firstEmpty = ORDER.findIndex((f) =>
      cells.slice(FACES.indexOf(f) * per, FACES.indexOf(f) * per + per).some((c) => c === null),
    )
    if (firstEmpty >= 0) {
      setFaceIndex(firstEmpty)
      return
    }
    const cube = cells as Cube
    const found = n === 3 ? validate(cube).map(validationMessage) : validate4(cube).map(validationMessage4)
    if (found.length > 0) {
      setMessages([...new Set(found)])
      return
    }
    if (n === 3 ? isSolved(cube) : getModel(4).isSolved(cube)) {
      setMessages([SOLVED_MESSAGE])
      return
    }
    onStart(cube)
  }

  return (
    <main className="screen input">
      <header className="input-head">
        <h2>{title}</h2>
        <p>{n === 3 ? INSTRUCTIONS[face] : INSTRUCTIONS4[face]}</p>
        <div className="scan-row">
          <button className="btn small primary" onClick={() => setScanning(true)}>
            Quét bằng camera
          </button>
          <span className="scan-hint">Không muốn tô từng ô? Quét lần lượt 6 mặt, app sẽ chỉ cách cầm khối.</span>
        </div>
      </header>

      <div className="input-main">
        <div
          className={`grid${n === 4 ? ' grid4' : ''}`}
          style={{ ['--face' as string]: COLOUR_HEX[face], ['--n' as string]: n }}
        >
          {Array.from({ length: per }, (_, offset) => {
            const colour = cells[base + offset]
            return (
              <button
                key={offset}
                className={`cell${colour ? '' : ' empty'}${n === 3 && offset === 4 ? ' centre' : ''}`}
                style={colour ? { background: COLOUR_HEX[colour] } : undefined}
                disabled={n === 3 && offset === 4}
                onClick={() => paint(offset)}
                aria-label={`Ô ${offset + 1}`}
              />
            )
          })}
        </div>

        <div className="palette">
          {FACES.map((colour) => (
            <button
              key={colour}
              className={`swatch${selected === colour ? ' selected' : ''}`}
              onClick={() => setSelected(colour)}
              aria-label={COLOUR_NAME[colour]}
            >
              <span className="dot" style={{ background: COLOUR_HEX[colour] }} />
              <span className="count">{remaining(colour)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="net" aria-label="Tiến độ">
        {ORDER.map((f) => {
          const [row, col] = NET_POSITION[f]
          const start = FACES.indexOf(f) * per
          return (
            <button
              key={f}
              className={`net-face${f === face ? ' current' : ''}`}
              style={{ gridRow: row, gridColumn: col, ['--n' as string]: n }}
              onClick={() => jump(f)}
              aria-label={`Mặt ${COLOUR_NAME[f]}`}
            >
              {cells.slice(start, start + per).map((c, i) => (
                <span key={i} style={{ background: c ? COLOUR_HEX[c] : '#2a2f3a' }} />
              ))}
            </button>
          )
        })}
      </div>

      {messages.length > 0 && (
        <ul className="messages">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <footer className="buttons">
        <button className="btn" onClick={() => (faceIndex === 0 ? onBack() : jump(ORDER[faceIndex - 1]))}>
          Quay lại
        </button>
        {last ? (
          <button className="btn primary" disabled={!faceFull} onClick={submit}>
            Kiểm tra và bắt đầu
          </button>
        ) : (
          <button className="btn primary" disabled={!faceFull} onClick={() => jump(ORDER[faceIndex + 1])}>
            Tiếp
          </button>
        )}
      </footer>

      {scanning && (
        <CameraScanner
          n={n}
          title={title}
          steps={scanSteps(n, (n === 3 ? SCAN_HOLD : SCAN_HOLD4)[face])}
          expected={n === 3 ? face : undefined}
          last={last}
          onCapture={applyScan}
          onClose={() => setScanning(false)}
        />
      )}
    </main>
  )
}
