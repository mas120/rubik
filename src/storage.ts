import {
  FACES,
  SOLVED,
  applyMoves,
  cubeFromString,
  cubeToString,
  normalize,
  parseMoves,
  solve,
  validate,
  type Cube,
  type Face,
  type Move,
} from './core'

const LESSON_KEY = 'rubik.lesson.v1'
const INPUT_KEY = 'rubik.input.v1'
const FREE_KEY = 'rubik.free.v1'

export interface SavedLesson {
  cube: Cube
  cursor: number
}

export function saveLesson(cube: Cube, cursor: number): void {
  try {
    localStorage.setItem(LESSON_KEY, JSON.stringify({ cube: cubeToString(cube), cursor }))
  } catch {
    return
  }
}

export function clearLesson(): void {
  try {
    localStorage.removeItem(LESSON_KEY)
  } catch {
    return
  }
}

export function loadLesson(): SavedLesson | null {
  try {
    const raw = localStorage.getItem(LESSON_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { cube: string; cursor: number }
    const cube = cubeFromString(data.cube)
    const normalised = normalize(cube)
    if (!normalised || normalised.some((s, i) => s !== cube[i]) || validate(cube).length > 0) {
      throw new Error('invalid')
    }
    solve(cube)
    if (!Number.isInteger(data.cursor) || data.cursor < 0) throw new Error('invalid')
    return { cube, cursor: data.cursor }
  } catch {
    clearLesson()
    return null
  }
}

export function saveDraft(cells: readonly (Face | null)[]): void {
  try {
    localStorage.setItem(INPUT_KEY, cells.map((c) => c ?? '.').join(''))
  } catch {
    return
  }
}

export function loadDraft(): (Face | null)[] | null {
  try {
    const raw = localStorage.getItem(INPUT_KEY)
    if (!raw || raw.length !== 54) return null
    const cells = [...raw].map((ch) => {
      if (ch === '.') return null
      if (!FACES.includes(ch as Face)) throw new Error('invalid')
      return ch as Face
    })
    return cells
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(INPUT_KEY)
  } catch {
    return
  }
}

export interface SavedFree {
  cube: Cube
  history: Move[]
}

export function saveFree(cube: Cube, history: readonly Move[]): void {
  try {
    localStorage.setItem(FREE_KEY, JSON.stringify({ cube: cubeToString(cube), history }))
  } catch {
    return
  }
}

export function loadFree(): SavedFree | null {
  try {
    const raw = localStorage.getItem(FREE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as { cube: string; history: string[] }
    const cube = cubeFromString(data.cube)
    const history = parseMoves(data.history.join(' '))
    if (history.some((m) => m[0] === 'y')) throw new Error('invalid')
    const normalised = normalize(cube)
    if (!normalised || normalised.some((s, i) => s !== cube[i]) || validate(cube).length > 0) {
      throw new Error('invalid')
    }
    if (applyMoves(SOLVED, history).some((s, i) => s !== cube[i])) throw new Error('invalid')
    return { cube, history }
  } catch {
    try {
      localStorage.removeItem(FREE_KEY)
    } catch {
      return null
    }
    return null
  }
}
