import {
  FACES,
  SOLVED,
  applyMoves,
  cubeFromString,
  getModel,
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
const FREE4_KEY = 'rubik.free4.v1'
const FREE_SIZE_KEY = 'rubik.free.size'

export interface SavedLesson {
  cube: Cube
  cursor: number
  extra: Move[]
}

export function saveLesson(cube: Cube, cursor: number, extra: readonly Move[] = []): void {
  try {
    localStorage.setItem(LESSON_KEY, JSON.stringify({ cube: cubeToString(cube), cursor, extra }))
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
    const data = JSON.parse(raw) as { cube: string; cursor: number; extra?: string[] }
    const extra = data.extra === undefined ? [] : parseMoves(data.extra.join(' '))
    if (extra.some((m) => /^[xyz]/.test(m))) throw new Error('invalid')
    const cube = cubeFromString(data.cube)
    const normalised = normalize(cube)
    if (!normalised || normalised.some((s, i) => s !== cube[i]) || validate(cube).length > 0) {
      throw new Error('invalid')
    }
    solve(cube)
    if (!Number.isInteger(data.cursor) || data.cursor < 0) throw new Error('invalid')
    return { cube, cursor: data.cursor, extra }
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

export function saveFree(cube: Cube, history: readonly string[]): void {
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
    if (history.some((m) => /^[xyz]/.test(m))) throw new Error('invalid')
    if (validate(cube).length > 0) throw new Error('invalid')
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

export interface SavedFree4 {
  cube: Cube
  history: string[]
}

export function saveFree4(cube: Cube, history: readonly string[]): void {
  try {
    localStorage.setItem(FREE4_KEY, JSON.stringify({ cube: cubeToString(cube), history }))
  } catch {
    return
  }
}

export function loadFree4(): SavedFree4 | null {
  try {
    const raw = localStorage.getItem(FREE4_KEY)
    if (!raw) return null
    const model = getModel(4)
    const data = JSON.parse(raw) as { cube: string; history: string[] }
    if (data.cube.length !== 96) throw new Error('invalid')
    const cube = [...data.cube].map((ch) => {
      if (!FACES.includes(ch as Face)) throw new Error('invalid')
      return ch as Face
    })
    const history = model.parse(data.history.join(' '))
    if (history.some((m) => /^[xyz]/.test(m))) throw new Error('invalid')
    if (model.applyAll(model.solved, history).some((s, i) => s !== cube[i])) throw new Error('invalid')
    return { cube, history }
  } catch {
    try {
      localStorage.removeItem(FREE4_KEY)
    } catch {
      return null
    }
    return null
  }
}

export function loadFreeSize(): 3 | 4 {
  try {
    return localStorage.getItem(FREE_SIZE_KEY) === '4' ? 4 : 3
  } catch {
    return 3
  }
}

export function saveFreeSize(size: 3 | 4): void {
  try {
    localStorage.setItem(FREE_SIZE_KEY, String(size))
  } catch {
    return
  }
}
