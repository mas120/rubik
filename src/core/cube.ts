export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
export type Cube = readonly Face[]

type Turn = '' | "'" | '2'
export type FaceMove = `${Face}${Turn}`
export type RotationMove = 'y' | "y'" | 'y2'
export type Move = FaceMove | RotationMove

export const FACES: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B']

export interface Slot {
  name: string
  facelets: readonly number[]
  faces: readonly Face[]
  layer: 'U' | 'M' | 'D'
}

function makeSlot(name: string, facelets: number[]): Slot {
  return {
    name,
    facelets,
    faces: facelets.map((i) => FACES[Math.floor(i / 9)]),
    layer: name[0] === 'U' ? 'U' : name[0] === 'D' ? 'D' : 'M',
  }
}

export const EDGE_SLOTS: readonly Slot[] = [
  makeSlot('UR', [5, 10]),
  makeSlot('UF', [7, 19]),
  makeSlot('UL', [3, 37]),
  makeSlot('UB', [1, 46]),
  makeSlot('DR', [32, 16]),
  makeSlot('DF', [28, 25]),
  makeSlot('DL', [30, 43]),
  makeSlot('DB', [34, 52]),
  makeSlot('FR', [23, 12]),
  makeSlot('FL', [21, 41]),
  makeSlot('BL', [50, 39]),
  makeSlot('BR', [48, 14]),
]

export const CORNER_SLOTS: readonly Slot[] = [
  makeSlot('UFR', [8, 9, 20]),
  makeSlot('UFL', [6, 18, 38]),
  makeSlot('UBL', [0, 36, 47]),
  makeSlot('UBR', [2, 45, 11]),
  makeSlot('DFR', [29, 26, 15]),
  makeSlot('DFL', [27, 44, 24]),
  makeSlot('DBL', [33, 53, 42]),
  makeSlot('DBR', [35, 17, 51]),
]

export type Vec = readonly [number, number, number]

export const FACE_NORMALS: Record<Face, Vec> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
}

function stickerGeometry(index: number): { pos: Vec; normal: Vec } {
  const face = FACES[Math.floor(index / 9)]
  const r = Math.floor((index % 9) / 3)
  const c = index % 3
  let pos: Vec
  switch (face) {
    case 'U':
      pos = [c - 1, 1, r - 1]
      break
    case 'R':
      pos = [1, 1 - r, 1 - c]
      break
    case 'F':
      pos = [c - 1, 1 - r, 1]
      break
    case 'D':
      pos = [c - 1, -1, 1 - r]
      break
    case 'L':
      pos = [-1, 1 - r, c - 1]
      break
    case 'B':
      pos = [1 - c, 1 - r, -1]
      break
  }
  return { pos, normal: FACE_NORMALS[face] }
}

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

function clockwise(v: Vec, axis: Vec): Vec {
  const c = cross(axis, v)
  const d = dot(axis, v)
  return [-c[0] + axis[0] * d, -c[1] + axis[1] * d, -c[2] + axis[2] * d]
}

export const STICKER_GEOMETRY: readonly { pos: Vec; normal: Vec }[] = Array.from({ length: 54 }, (_, i) => stickerGeometry(i))
const KEY_TO_INDEX = new Map(STICKER_GEOMETRY.map((g, i) => [`${g.pos}|${g.normal}`, i]))

function quarterTurnTable(axis: Vec, wholeCube: boolean): number[] {
  const table = Array.from({ length: 54 }, (_, i) => i)
  STICKER_GEOMETRY.forEach(({ pos, normal }, i) => {
    if (!wholeCube && dot(pos, axis) !== 1) return
    const target = KEY_TO_INDEX.get(`${clockwise(pos, axis)}|${clockwise(normal, axis)}`)!
    table[target] = i
  })
  return table
}

function composePower(table: number[], times: number): number[] {
  let result = Array.from({ length: 54 }, (_, i) => i)
  for (let t = 0; t < times; t++) result = result.map((_, j) => result[table[j]])
  return result
}

const TURN_SUFFIXES: readonly [Turn, number][] = [
  ['', 1],
  ["'", 3],
  ['2', 2],
]

const TABLES = new Map<Move, number[]>()

for (const face of FACES) {
  const base = quarterTurnTable(FACE_NORMALS[face], false)
  for (const [suffix, times] of TURN_SUFFIXES) {
    TABLES.set(`${face}${suffix}`, composePower(base, times))
  }
}
{
  const base = quarterTurnTable(FACE_NORMALS.U, true)
  for (const [suffix, times] of TURN_SUFFIXES) {
    TABLES.set(`y${suffix}` as RotationMove, composePower(base, times))
  }
}

export const MOVES: readonly Move[] = [...TABLES.keys()]

export const SOLVED: Cube = FACES.flatMap((f) => Array<Face>(9).fill(f))

export function applyMove(cube: Cube, move: Move): Cube {
  const table = TABLES.get(move)
  if (!table) throw new Error(`Unknown move: ${move}`)
  return table.map((from) => cube[from])
}

export function applyMoves(cube: Cube, moves: readonly Move[]): Cube {
  return moves.reduce(applyMove, cube)
}

export function invertMove(move: Move): Move {
  if (move.endsWith('2')) return move
  return (move.endsWith("'") ? move.slice(0, -1) : `${move}'`) as Move
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return moves.map(invertMove).reverse()
}

export function parseMoves(text: string): Move[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  return tokens.map((token) => {
    if (!TABLES.has(token as Move)) throw new Error(`Unknown move: ${token}`)
    return token as Move
  })
}

export function formatMoves(moves: readonly Move[]): string {
  return moves.join(' ')
}

export function cubeToString(cube: Cube): string {
  return cube.join('')
}

export function cubeFromString(text: string): Cube {
  if (text.length !== 54) throw new Error(`Expected 54 characters, got ${text.length}`)
  return [...text].map((ch) => {
    if (!FACES.includes(ch as Face)) throw new Error(`Invalid sticker: ${ch}`)
    return ch as Face
  })
}

export function toHomeOrientation(cube: Cube): { cube: Cube; rotation: Move[] } {
  const rotations: Move[][] = [[], ['y'], ['y2'], ["y'"]]
  for (const rotation of rotations) {
    const rotated = applyMoves(cube, rotation)
    if (rotated[22] === 'F') return { cube: rotated, rotation }
  }
  return { cube, rotation: [] }
}

export function isSolved(cube: Cube): boolean {
  return FACES.every((_, f) => {
    const first = cube[f * 9]
    return cube.slice(f * 9, f * 9 + 9).every((s) => s === first)
  })
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomScramble(length: number, rng: () => number): Move[] {
  const moves: Move[] = []
  let previous: Face | null = null
  for (let i = 0; i < length; i++) {
    const choices = FACES.filter((f) => f !== previous)
    const face = choices[Math.floor(rng() * choices.length)]
    const suffix = TURN_SUFFIXES[Math.floor(rng() * 3)][0]
    moves.push(`${face}${suffix}`)
    previous = face
  }
  return moves
}
