import { useEffect, useRef, useState } from 'react'
import { COLOUR_HEX } from '../colors'
import { FACES, type Face } from '../core'
import { classifyFace, guideRect, sampleGrid } from '../scan/classify'
import { centreWarning } from '../scan/texts'

const SAMPLE_SIZE = 120
const GUIDE_FRACTION = 0.7

const hasCamera = () => typeof navigator.mediaDevices?.getUserMedia === 'function'

interface Props {
  n: 3 | 4
  title: string
  steps: string[]
  expected?: Face
  last: boolean
  onCapture(colours: Face[]): void
  onClose(): void
}

export function CameraScanner({ n, title, steps, expected, last, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(() =>
    hasCamera() ? null : 'Trình duyệt này không hỗ trợ camera.',
  )
  const [detected, setDetected] = useState<Face[] | null>(null)
  const [review, setReview] = useState<Face[] | null>(null)

  useEffect(() => {
    if (!hasCamera()) return
    let cancelled = false
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (video) {
          video.srcObject = s
          void video.play().catch(() => {})
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Bạn chưa cho phép dùng camera. Hãy cấp quyền trong trình duyệt rồi thử lại.'
            : 'Không mở được camera.',
        )
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const reviewing = review !== null

  useEffect(() => {
    if (error || reviewing) return
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const timer = setInterval(() => {
      const video = videoRef.current
      if (!video || video.videoWidth === 0) return
      const { x, y, size } = guideRect(video.videoWidth, video.videoHeight, GUIDE_FRACTION)
      context.drawImage(video, x, y, size, size, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
      setDetected(classifyFace(sampleGrid(data, SAMPLE_SIZE, n)))
    }, 200)
    return () => clearInterval(timer)
  }, [n, error, reviewing])

  const capture = () => {
    if (!detected) return
    const next = [...detected]
    if (expected) next[4] = expected
    setReview(next)
  }

  const cycle = (offset: number) => {
    setReview((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[offset] = FACES[(FACES.indexOf(prev[offset]) + 1) % FACES.length]
      return next
    })
  }

  const confirm = () => {
    if (!review) return
    onCapture(review)
    setReview(null)
    setDetected(null)
  }

  if (error) {
    return (
      <div className="scanner">
        <p className="scanner-error">{error}</p>
        <div className="buttons">
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="scanner">
      <h2>{title}</h2>
      {review ? (
        <>
          <p>So với khối thật. Ô nào sai màu thì chạm vào ô đó để đổi sang màu khác, chạm tiếp cho đến khi đúng.</p>
          <div
            className={`grid${n === 4 ? ' grid4' : ''}`}
            style={{ ['--face' as string]: expected ? COLOUR_HEX[expected] : '#343a48', ['--n' as string]: n }}
          >
            {review.map((colour, offset) => (
              <button
                key={offset}
                className={`cell${n === 3 && offset === 4 ? ' centre' : ''}`}
                style={{ background: COLOUR_HEX[colour] }}
                disabled={n === 3 && offset === 4}
                onClick={() => cycle(offset)}
                aria-label={`Ô ${offset + 1}`}
              />
            ))}
          </div>
        </>
      ) : (
        <ol className="scanner-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <div className="scanner-view" hidden={reviewing}>
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="scanner-guide" style={{ ['--n' as string]: n }}>
          {Array.from({ length: n * n }, (_, i) => (
            <span key={i} className="scanner-cell">
              {detected && <span className="dot" style={{ background: COLOUR_HEX[detected[i]] }} />}
            </span>
          ))}
        </div>
      </div>
      {!reviewing && (
        <>
          <p className="scanner-tip">Quét ở nơi đủ sáng, tránh để đèn phản chiếu lên mặt khối.</p>
          {expected && detected && detected[4] !== expected && (
            <p className="scanner-warning">{centreWarning(detected[4], expected)}</p>
          )}
        </>
      )}
      <div className="buttons">
        {review ? (
          <>
            <button className="btn" onClick={() => setReview(null)}>
              Chụp lại
            </button>
            <button className="btn primary" onClick={confirm}>
              {last ? 'Xong' : 'Đúng rồi, quét mặt tiếp theo'}
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
            <button className="btn primary" disabled={!detected} onClick={capture}>
              Chụp
            </button>
          </>
        )}
      </div>
    </div>
  )
}
