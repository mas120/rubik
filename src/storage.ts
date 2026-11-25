import { FACES, cubeFromString, cubeToString, normalize, solve, validate, type Cube, type Face } from './core'

const LESSON_KEY = 'rubik.lesson.v1'
const INPUT_KEY = 'rubik.input.v1'

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
