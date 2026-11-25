import { useEffect, useState } from 'react'
import { COLOUR_HEX, COLOUR_NAME } from '../colors'
import { FACES, isSolved, validate, type Cube, type Face } from '../core'
import { validationMessage } from '../lesson/texts'
import { loadDraft, saveDraft } from '../storage'

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

function initialCells(prefill: Cube | undefined, persist: boolean): (Face | null)[] {
  if (prefill) return [...prefill]
  const draft = persist ? loadDraft() : null
  const cells: (Face | null)[] = draft ?? Array<Face | null>(54).fill(null)
  FACES.forEach((f, i) => {
    cells[i * 9 + 4] = f
  })
  return cells
}

interface Props {
  prefill?: Cube
  persist: boolean
  onBack(): void
  onStart(cube: Cube): void
}

export function Input({ prefill, persist, onBack, onStart }: Props) {
  const [cells, setCells] = useState(() => initialCells(prefill, persist))
  const [faceIndex, setFaceIndex] = useState(0)
  const [selected, setSelected] = useState<Face>('F')
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    if (persist && !prefill) saveDraft(cells)
  }, [cells, persist, prefill])

  const face = ORDER[faceIndex]
  const base = FACES.indexOf(face) * 9
  const remaining = (colour: Face) => 9 - cells.filter((c) => c === colour).length
  const faceFull = cells.slice(base, base + 9).every((c) => c !== null)
  const last = faceIndex === ORDER.length - 1

  const paint = (offset: number) => {
    if (offset === 4) return
    const index = base + offset
    setMessages([])
    setCells((prev) => {
      const next = [...prev]
      if (prev[index] === selected) next[index] = null
      else if (9 - prev.filter((c) => c === selected).length > 0) next[index] = selected
      return next
    })
  }

  const jump = (target: Face) => {
    setMessages([])
    setFaceIndex(ORDER.indexOf(target))
  }

  const submit = () => {
    const firstEmpty = ORDER.findIndex((f) =>
      cells.slice(FACES.indexOf(f) * 9, FACES.indexOf(f) * 9 + 9).some((c) => c === null),
    )
    if (firstEmpty >= 0) {
      setFaceIndex(firstEmpty)
      return
    }
    const cube = cells as Cube
    const errors = validate(cube)
    if (errors.length > 0) {
      setMessages([...new Set(errors.map(validationMessage))])
      return
    }
    if (isSolved(cube)) {
      setMessages([SOLVED_MESSAGE])
      return
    }
    onStart(cube)
  }

  return (
    <main className="screen input">
      <header className="input-head">
        <h2>
          Mặt {faceIndex + 1}/6 — tâm {COLOUR_NAME[face]}
        </h2>
        <p>{INSTRUCTIONS[face]}</p>
      </header>

      <div className="input-main">
        <div className="grid" style={{ ['--face' as string]: COLOUR_HEX[face] }}>
          {Array.from({ length: 9 }, (_, offset) => {
            const colour = cells[base + offset]
            return (
              <button
                key={offset}
                className={`cell${colour ? '' : ' empty'}${offset === 4 ? ' centre' : ''}`}
                style={colour ? { background: COLOUR_HEX[colour] } : undefined}
                disabled={offset === 4}
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
          const start = FACES.indexOf(f) * 9
          return (
            <button
              key={f}
              className={`net-face${f === face ? ' current' : ''}`}
              style={{ gridRow: row, gridColumn: col }}
              onClick={() => jump(f)}
              aria-label={`Mặt ${COLOUR_NAME[f]}`}
            >
              {cells.slice(start, start + 9).map((c, i) => (
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
    </main>
  )
}
