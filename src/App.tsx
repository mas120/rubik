import { useState } from 'react'
import {
  SOLVED,
  applyMoves,
  getModel,
  isSolved,
  mulberry32,
  randomScramble,
  type Cube,
} from './core'
import { FreePlay } from './screens/FreePlay'
import { Home } from './screens/Home'
import { Input } from './screens/Input'
import { Basics } from './screens/Basics'
import { Lesson } from './screens/Lesson'
import {
  basicsSeen,
  clearDraft,
  clearDraft4,
  clearLesson,
  loadLesson,
  loadSize,
  markBasicsSeen,
  saveLesson,
  saveSize,
} from './storage'

type Screen =
  | { name: 'home' }
  | { name: 'free'; persist: boolean; size?: 3 | 4 }
  | { name: 'basics'; n: 3 | 4; next: 'home' | 'input' | 'sample' }
  | { name: 'input'; n: 3 | 4; prefill?: Cube; persist: boolean }
  | { name: 'lesson'; id: number; n: 3 | 4; cube: Cube; cursor: number; extra: string[]; persist: boolean }

function scrambledCube(rng: () => number): Cube {
  let cube = SOLVED
  while (isSolved(cube)) cube = applyMoves(SOLVED, randomScramble(25, rng))
  return cube
}

function scrambledCube4(rng: () => number): Cube {
  const model = getModel(4)
  let cube = model.solved
  while (model.isSolved(cube)) cube = model.applyAll(model.solved, model.scramble(40, rng))
  return cube
}

let lessonId = 0

function initialScreen(): Screen {
  const params = new URLSearchParams(window.location.search)
  const demo = params.get('demo')
  if (demo !== null && Number.isInteger(Number(demo))) {
    const at = Number(params.get('at') ?? 0)
    const n = params.get('size') === '4' ? 4 : 3
    return {
      name: 'lesson',
      id: lessonId++,
      n,
      cube: n === 4 ? scrambledCube4(mulberry32(Number(demo))) : scrambledCube(mulberry32(Number(demo))),
      cursor: Number.isFinite(at) ? Math.max(0, Math.floor(at)) : 0,
      extra: [],
      persist: false,
    }
  }
  if (params.get('screen') === 'free') {
    return { name: 'free', persist: false, size: params.get('size') === '4' ? 4 : 3 }
  }
  if (params.get('screen') === 'basics') {
    return { name: 'basics', n: params.get('size') === '4' ? 4 : 3, next: 'home' }
  }
  if (params.get('screen') === 'input') {
    return { name: 'input', n: params.get('size') === '4' ? 4 : 3, persist: false }
  }
  return { name: 'home' }
}

function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [saved, setSaved] = useState(() => (screen.name === 'home' ? loadLesson() : null))

  const [size, setSize] = useState<3 | 4>(loadSize)

  const chooseSize = (next: 3 | 4) => {
    saveSize(next)
    setSize(next)
  }

  const startLesson = (n: 3 | 4, cube: Cube, cursor: number, persist: boolean, extra: string[] = []) => {
    if (persist) saveLesson(n, cube, cursor, extra)
    setScreen({ name: 'lesson', id: lessonId++, n, cube, cursor, extra, persist })
  }

  const goHome = () => {
    setSaved(loadLesson())
    setScreen({ name: 'home' })
  }

  const openBasics = (next: 'home' | 'input' | 'sample') => setScreen({ name: 'basics', n: size, next })

  const startSample = (n: 3 | 4) =>
    startLesson(n, n === 4 ? scrambledCube4(Math.random) : scrambledCube(Math.random), 0, true)

  if (screen.name === 'basics') {
    const leave = () => {
      markBasicsSeen()
      if (screen.next === 'input') setScreen({ name: 'input', n: screen.n, persist: true })
      else if (screen.next === 'sample') startSample(screen.n)
      else goHome()
    }
    return (
      <Basics
        key={screen.n}
        n={screen.n}
        finishLabel={screen.next === 'home' ? 'Về trang đầu' : 'Bắt đầu'}
        onFinish={leave}
        onSkip={leave}
      />
    )
  }

  if (screen.name === 'free') {
    return (
      <FreePlay
        persist={screen.persist}
        initialSize={screen.size}
        onHome={goHome}
        onTeach={(n, cube) => startLesson(n, cube, 0, true)}
      />
    )
  }

  if (screen.name === 'input') {
    return (
      <Input
        key={`${screen.n}-${screen.prefill ? 'prefill' : 'blank'}`}
        n={screen.n}
        prefill={screen.prefill}
        persist={screen.persist}
        onBack={goHome}
        onStart={(cube) => {
          if (screen.persist && !screen.prefill) {
            if (screen.n === 3) clearDraft()
            else clearDraft4()
          }
          startLesson(screen.n, cube, 0, true)
        }}
      />
    )
  }

  if (screen.name === 'lesson') {
    return (
      <Lesson
        key={screen.id}
        n={screen.n}
        cube={screen.cube}
        initialCursor={screen.cursor}
        initialExtra={screen.extra}
        persist={screen.persist}
        onHome={goHome}
        onFinish={() => {
          if (screen.persist) clearLesson()
          goHome()
        }}
        onRestart={(cube) => startLesson(screen.n, cube, 0, screen.persist)}
        onReenter={(cube) => setScreen({ name: 'input', n: screen.n, prefill: cube, persist: screen.persist })}
      />
    )
  }

  return (
    <Home
      hasSaved={saved !== null}
      newcomer={saved === null && !basicsSeen()}
      size={size}
      onSize={chooseSize}
      onContinue={() => saved && startLesson(saved.n, saved.cube, saved.cursor, true, saved.extra)}
      onInput={() => (basicsSeen() ? setScreen({ name: 'input', n: size, persist: true }) : openBasics('input'))}
      onSample={() => (basicsSeen() ? startSample(size) : openBasics('sample'))}
      onFree={() => setScreen({ name: 'free', persist: true })}
      onBasics={() => openBasics('home')}
    />
  )
}

export default App
