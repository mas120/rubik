interface Props {
  hasSaved: boolean
  size: 3 | 4
  onSize(size: 3 | 4): void
  onContinue(): void
  onInput(): void
  onSample(): void
  onFree(): void
}

export function Home({ hasSaved, size, onSize, onContinue, onInput, onSample, onFree }: Props) {
  return (
    <main className="screen home">
      <div className="home-title">
        <h1>Rubik</h1>
        <p>Học giải Rubik từng bước</p>
      </div>
      <div className="home-actions">
        <div className="segmented" role="radiogroup">
          {([3, 4] as const).map((option) => (
            <button
              key={option}
              role="radio"
              aria-checked={size === option}
              className={`seg${size === option ? ' active' : ''}`}
              onClick={() => onSize(option)}
            >
              {option}×{option}
            </button>
          ))}
        </div>
        {hasSaved && (
          <button className="btn primary" onClick={onContinue}>
            Tiếp tục bài đang học
          </button>
        )}
        <button className={hasSaved ? 'btn' : 'btn primary'} disabled={size === 4} onClick={onInput}>
          Nhập khối của bạn
        </button>
        {size === 4 && <p className="hint-line">Nhập màu cho 4×4 đang được xây dựng.</p>}
        <button className="btn" onClick={onSample}>
          Thử với khối mẫu
        </button>
        <button className="btn" onClick={onFree}>
          Xoay tự do
        </button>
      </div>
    </main>
  )
}
