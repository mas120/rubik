import { useState } from 'react'
import {
  SOLVED,
  applyMoves,
  isSolved,
  mulberry32,
  randomScramble,
  type Cube,
} from './core'
import { FreePlay } from './screens/FreePlay'
import { Home } from './screens/Home'
import { Input } from './screens/Input'
import { Lesson } from './screens/Lesson'
import { clearDraft, clearLesson, loadLesson, saveLesson } from './storage'

type Screen =
  | { name: 'home' }
  | { name: 'free'; persist: boolean }
  | { name: 'input'; prefill?: Cube; persist: boolean }
  | { name: 'lesson'; id: number; cube: Cube; cursor: number; persist: boolean }

function scrambledCube(rng: () => number): Cube {
  let cube = SOLVED
  while (isSolved(cube)) cube = applyMoves(SOLVED, randomScramble(25, rng))
  return cube
}

let lessonId = 0

function initialScreen(): Screen {
  const params = new URLSearchParams(window.location.search)
  const demo = params.get('demo')
  if (demo !== null && Number.isInteger(Number(demo))) {
    const at = Number(params.get('at') ?? 0)
    return {
      name: 'lesson',
      id: lessonId++,
      cube: scrambledCube(mulberry32(Number(demo))),
      cursor: Number.isFinite(at) ? Math.max(0, Math.floor(at)) : 0,
      persist: false,
    }
  }
  if (params.get('screen') === 'free') return { name: 'free', persist: false }
  if (params.get('screen') === 'input') return { name: 'input', persist: false }
  return { name: 'home' }
}

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [saved, setSaved] = useState(() => (screen.name === 'home' ? loadLesson() : null))

  const startLesson = (cube: Cube, cursor: number, persist: boolean) => {
    if (persist) saveLesson(cube, cursor)
    setScreen({ name: 'lesson', id: lessonId++, cube, cursor, persist })
  }

  const goHome = () => {
    setSaved(loadLesson())
    setScreen({ name: 'home' })
  }

  if (screen.name === 'free') {
    return <FreePlay persist={screen.persist} onHome={goHome} onTeach={(cube) => startLesson(cube, 0, true)} />
  }

  if (screen.name === 'input') {
    return (
      <Input
        key={screen.prefill ? 'prefill' : 'blank'}
        prefill={screen.prefill}
        persist={screen.persist}
        onBack={goHome}
        onStart={(cube) => {
          if (screen.persist && !screen.prefill) clearDraft()
          startLesson(cube, 0, true)
        }}
      />
    )
  }

  if (screen.name === 'lesson') {
    return (
      <Lesson
        key={screen.id}
        cube={screen.cube}
        initialCursor={screen.cursor}
        persist={screen.persist}
        onHome={goHome}
        onFinish={() => {
          if (screen.persist) clearLesson()
          goHome()
        }}
        onReenter={(cube) => setScreen({ name: 'input', prefill: cube, persist: screen.persist })}
      />
    )
  }

  return (
    <Home
      hasSaved={saved !== null}
      onContinue={() => saved && startLesson(saved.cube, saved.cursor, true)}
      onInput={() => setScreen({ name: 'input', persist: true })}
      onSample={() => startLesson(scrambledCube(Math.random), 0, true)}
      onFree={() => setScreen({ name: 'free', persist: true })}
    />
  )
}

export default App
