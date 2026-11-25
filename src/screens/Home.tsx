interface Props {
  hasSaved: boolean
  onContinue(): void
  onInput(): void
  onSample(): void
}

export function Home({ hasSaved, onContinue, onInput, onSample }: Props) {
  return (
    <main className="screen home">
      <div className="home-title">
        <h1>Rubik</h1>
        <p>Học giải Rubik từng bước</p>
      </div>
      <div className="home-actions">
        {hasSaved && (
          <button className="btn primary" onClick={onContinue}>
            Tiếp tục bài đang học
          </button>
        )}
        <button className={hasSaved ? 'btn' : 'btn primary'} onClick={onInput}>
          Nhập khối của bạn
        </button>
        <button className="btn" onClick={onSample}>
          Thử với khối mẫu
        </button>
      </div>
    </main>
  )
}
