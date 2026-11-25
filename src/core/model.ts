import { FACES, FACE_NORMALS, randomScramble, type Cube, type Face, type Vec } from './cube'

export interface TurnSpec {
  face: Face
  from: number
  to: number
  quarters: 1 | 2 | 3
}

export interface StickerInfo {
  face: Face
  row: number
  col: number
  cell: readonly [number, number, number]
  normal: Vec
}

export interface CubeModel {
  n: number
  solved: Cube
  stickers: readonly StickerInfo[]
  moves: readonly string[]
  spec(move: string): TurnSpec
  apply(cube: Cube, move: string): Cube
  applyAll(cube: Cube, moves: readonly string[]): Cube
  invert(move: string): string
  parse(text: string): string[]
  isSolved(cube: Cube): boolean
  scramble(length: number, rng: () => number): string[]
  dragMove(axis: 0 | 1 | 2, index: number, sign: 1 | -1): string
}

interface BaseSpec {
  face: Face
  from: number
  to: number
}

const SUFFIXES: readonly [string, 1 | 2 | 3][] = [
  ['', 1],
  ["'", 3],
  ['2', 2],
]

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

function clockwise(v: Vec, axis: Vec): Vec {
  const c = cross(axis, v)
  const d = dot(axis, v)
  return [-c[0] + axis[0] * d || 0, -c[1] + axis[1] * d || 0, -c[2] + axis[2] * d || 0]
}

function stickerCell(face: Face, r: number, c: number, n: number): [number, number, number] {
  const k = n - 1
  switch (face) {
    case 'U':
      return [c, k, r]
    case 'R':
      return [k, k - r, k - c]
    case 'F':
      return [c, k - r, k]
    case 'D':
      return [c, 0, k - r]
    case 'L':
      return [0, k - r, c]
    case 'B':
      return [k - c, k - r, 0]
  }
}

function baseSpecs(n: 3 | 4): Record<string, BaseSpec> {
  const specs: Record<string, BaseSpec> = {}
  for (const f of FACES) specs[f] = { face: f, from: 0, to: 0 }
  if (n === 3) {
    specs.M = { face: 'L', from: 1, to: 1 }
    specs.E = { face: 'D', from: 1, to: 1 }
    specs.S = { face: 'F', from: 1, to: 1 }
  } else {
    for (const f of FACES) {
      specs[`${f}w`] = { face: f, from: 0, to: 1 }
      specs[`2${f}`] = { face: f, from: 1, to: 1 }
    }
  }
  specs.x = { face: 'R', from: 0, to: n - 1 }
  specs.y = { face: 'U', from: 0, to: n - 1 }
  specs.z = { face: 'F', from: 0, to: n - 1 }
  return specs
}

export function turnRotation(spec: TurnSpec): { axis: Vec; angle: number } {
  const angle = spec.quarters === 1 ? -Math.PI / 2 : spec.quarters === 2 ? -Math.PI : Math.PI / 2
  return { axis: FACE_NORMALS[spec.face], angle }
}

export function layerDepth(n: number, face: Face, cell: readonly number[]): number {
  const k = n - 1
  const a = FACE_NORMALS[face]
  const p2: Vec = [2 * cell[0] - k, 2 * cell[1] - k, 2 * cell[2] - k]
  return (k - dot(p2, a)) / 2
}

export function inTurn(n: number, spec: TurnSpec, cell: readonly number[]): boolean {
  const depth = layerDepth(n, spec.face, cell)
  return depth >= spec.from && depth <= spec.to
}

function faceLetter(move: string): Face {
  return move.replace(/^2/, '')[0] as Face
}

function buildModel(n: 3 | 4): CubeModel {
  const k = n - 1
  const stickers: StickerInfo[] = FACES.flatMap((face) =>
    Array.from({ length: n * n }, (_, i) => {
      const row = Math.floor(i / n)
      const col = i % n
      return { face, row, col, cell: stickerCell(face, row, col, n), normal: FACE_NORMALS[face] }
    }),
  )
  const keyOf = (p2: Vec, normal: Vec) => `${p2}|${normal}`
  const indexByKey = new Map(
    stickers.map((s, i) => [keyOf([2 * s.cell[0] - k, 2 * s.cell[1] - k, 2 * s.cell[2] - k], s.normal), i]),
  )

  const bases = baseSpecs(n)
  const specs = new Map<string, TurnSpec>()
  const tables = new Map<string, number[]>()
  for (const [name, base] of Object.entries(bases)) {
    const axis = FACE_NORMALS[base.face]
    const quarter = Array.from({ length: stickers.length }, (_, i) => i)
    stickers.forEach((s, i) => {
      if (!inTurn(n, { ...base, quarters: 1 }, s.cell)) return
      const p2: Vec = [2 * s.cell[0] - k, 2 * s.cell[1] - k, 2 * s.cell[2] - k]
      const target = indexByKey.get(keyOf(clockwise(p2, axis), clockwise(s.normal, axis)))!
      quarter[target] = i
    })
    for (const [suffix, quarters] of SUFFIXES) {
      let table = Array.from({ length: stickers.length }, (_, i) => i)
      for (let t = 0; t < quarters; t++) {
        const previous = table
        table = previous.map((_, j) => previous[quarter[j]])
      }
      specs.set(`${name}${suffix}`, { ...base, quarters })
      tables.set(`${name}${suffix}`, table)
    }
  }

  const moves = [...specs.keys()]
  const solved: Cube = FACES.flatMap((f) => Array<Face>(n * n).fill(f))
  const spec = (move: string): TurnSpec => {
    const found = specs.get(move)
    if (!found) throw new Error(`Unknown move: ${move}`)
    return found
  }
  const apply = (cube: Cube, move: string): Cube => {
    const table = tables.get(move)
    if (!table) throw new Error(`Unknown move: ${move}`)
    return table.map((from) => cube[from])
  }

  const dragMove = (axis: 0 | 1 | 2, index: number, sign: 1 | -1): string => {
    const axisVector: Vec = [axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0]
    if (n === 3 && index === 1) {
      const slices: [string, Face][] = [
        ['M', 'L'],
        ['E', 'D'],
        ['S', 'F'],
      ]
      const [name, reference] = slices[axis]
      return sign * dot(FACE_NORMALS[reference], axisVector) === -1 ? name : `${name}'`
    }
    const negative: Face[] = ['L', 'D', 'B']
    const positive: Face[] = ['R', 'U', 'F']
    const near = index < n / 2
    const face = near ? negative[axis] : positive[axis]
    const depth = near ? index : k - index
    const name = depth === 0 ? face : `2${face}`
    return sign * dot(FACE_NORMALS[face], axisVector) === -1 ? name : `${name}'`
  }

  return {
    n,
    solved,
    stickers,
    moves,
    spec,
    apply,
    applyAll: (cube, list) => list.reduce(apply, cube),
    invert: (move) => {
      spec(move)
      if (move.endsWith('2')) return move
      return move.endsWith("'") ? move.slice(0, -1) : `${move}'`
    },
    parse: (text) =>
      text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => {
          spec(token)
          return token
        }),
    isSolved: (cube) =>
      FACES.every((_, f) => {
        const first = cube[f * n * n]
        return cube.slice(f * n * n, (f + 1) * n * n).every((s) => s === first)
      }),
    scramble: (length, rng) => {
      if (n === 3) return randomScramble(length, rng)
      const result: string[] = []
      let previous: Face | null = null
      for (let i = 0; i < length; i++) {
        const choices = FACES.filter((f) => f !== previous)
        const face = choices[Math.floor(rng() * choices.length)]
        const wide = rng() < 0.5 ? 'w' : ''
        const suffix = SUFFIXES[Math.floor(rng() * 3)][0]
        result.push(`${face}${wide}${suffix}`)
        previous = face
      }
      return result
    },
    dragMove,
  }
}

const models = new Map<number, CubeModel>()

export function getModel(n: 3 | 4): CubeModel {
  let model = models.get(n)
  if (!model) {
    model = buildModel(n)
    models.set(n, model)
  }
  return model
}

export { faceLetter }
