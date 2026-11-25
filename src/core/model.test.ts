import { describe, expect, it } from 'vitest'
import { MOVES, SOLVED, applyMove, mulberry32, randomScramble, type Cube, type Vec } from './cube'
import { getModel, inTurn, turnRotation } from './model'

const DRAG_TABLE_3: [0 | 1 | 2, number, 1 | -1, string][] = [
  [0, 0, 1, 'L'],
  [0, 0, -1, "L'"],
  [0, 1, 1, 'M'],
  [0, 1, -1, "M'"],
  [0, 2, 1, "R'"],
  [0, 2, -1, 'R'],
  [1, 0, 1, 'D'],
  [1, 0, -1, "D'"],
  [1, 1, 1, 'E'],
  [1, 1, -1, "E'"],
  [1, 2, 1, "U'"],
  [1, 2, -1, 'U'],
  [2, 0, 1, 'B'],
  [2, 0, -1, "B'"],
  [2, 1, 1, "S'"],
  [2, 1, -1, 'S'],
  [2, 2, 1, "F'"],
  [2, 2, -1, 'F'],
]

function faceRows(cube: Cube, n: number, face: number): string[] {
  return Array.from({ length: n }, (_, r) => cube.slice(face * n * n + r * n, face * n * n + r * n + n).join(''))
}

function faces(cube: Cube, n: number): Record<string, string[]> {
  return Object.fromEntries(['U', 'R', 'F', 'D', 'L', 'B'].map((f, i) => [f, faceRows(cube, n, i)]))
}

const m3 = getModel(3)
const m4 = getModel(4)

function scrambled(model: ReturnType<typeof getModel>, seed: number, length = 30): Cube {
  return model.applyAll(model.solved, model.scramble(length, mulberry32(seed)))
}

function randomMix(model: ReturnType<typeof getModel>, seed: number, length = 30): Cube {
  const rng = mulberry32(seed)
  return model.applyAll(
    model.solved,
    Array.from({ length }, () => model.moves[Math.floor(rng() * model.moves.length)]),
  )
}

describe('3x3 model matches cube.ts', () => {
  it('has the same solved state and moves', () => {
    expect(m3.solved).toEqual(SOLVED)
    expect([...m3.moves].sort()).toEqual([...MOVES].sort())
    expect(m3.moves).toHaveLength(36)
  })

  it('applies every move identically on 50 seeded states', () => {
    for (let seed = 0; seed < 50; seed++) {
      const cube = applyMoves3(seed)
      for (const move of MOVES) expect(m3.apply(cube, move)).toEqual(applyMove(cube, move))
    }
  })

  it.each(DRAG_TABLE_3)('dragMove(%i, %i, %i) is %s', (axis, index, sign, expected) => {
    expect(m3.dragMove(axis, index, sign)).toBe(expected)
  })

  it('scrambles like randomScramble', () => {
    expect(m3.scramble(20, mulberry32(5))).toEqual(randomScramble(20, mulberry32(5)))
  })
})

function applyMoves3(seed: number): Cube {
  return m3.applyAll(SOLVED, randomScramble(25, mulberry32(seed)))
}

describe('4x4 model', () => {
  it('has 63 moves and a 96-sticker solved state', () => {
    expect(m4.moves).toHaveLength(63)
    expect(m4.solved).toHaveLength(96)
    expect(m4.isSolved(m4.solved)).toBe(true)
  })

  it('R', () => {
    const f = faces(m4.apply(m4.solved, 'R'), 4)
    expect(f.U).toEqual(Array(4).fill('UUUF'))
    expect(f.F).toEqual(Array(4).fill('FFFD'))
    expect(f.D).toEqual(Array(4).fill('DDDB'))
    expect(f.B).toEqual(Array(4).fill('UBBB'))
    expect(f.R).toEqual(Array(4).fill('RRRR'))
    expect(f.L).toEqual(Array(4).fill('LLLL'))
  })

  it('2R', () => {
    const f = faces(m4.apply(m4.solved, '2R'), 4)
    expect(f.U).toEqual(Array(4).fill('UUFU'))
    expect(f.F).toEqual(Array(4).fill('FFDF'))
    expect(f.D).toEqual(Array(4).fill('DDBD'))
    expect(f.B).toEqual(Array(4).fill('BUBB'))
  })

  it('Rw equals R then 2R', () => {
    const cube = scrambled(m4, 3)
    expect(m4.apply(cube, 'Rw')).toEqual(m4.applyAll(cube, ['R', '2R']))
  })

  it('U and 2U', () => {
    const u = faces(m4.apply(m4.solved, 'U'), 4)
    expect(u.R).toEqual(['BBBB', 'RRRR', 'RRRR', 'RRRR'])
    expect(u.F).toEqual(['RRRR', 'FFFF', 'FFFF', 'FFFF'])
    expect(u.L).toEqual(['FFFF', 'LLLL', 'LLLL', 'LLLL'])
    expect(u.B).toEqual(['LLLL', 'BBBB', 'BBBB', 'BBBB'])
    const u2 = faces(m4.apply(m4.solved, '2U'), 4)
    expect(u2.R).toEqual(['RRRR', 'BBBB', 'RRRR', 'RRRR'])
    expect(u2.F).toEqual(['FFFF', 'RRRR', 'FFFF', 'FFFF'])
    expect(u2.L).toEqual(['LLLL', 'FFFF', 'LLLL', 'LLLL'])
    expect(u2.B).toEqual(['BBBB', 'LLLL', 'BBBB', 'BBBB'])
    expect(u2.U).toEqual(Array(4).fill('UUUU'))
  })

  it('whole-cube rotations equal wide pairs', () => {
    const cube = scrambled(m4, 8)
    expect(m4.apply(cube, 'x')).toEqual(m4.applyAll(cube, ['Rw', "Lw'"]))
    expect(m4.apply(cube, 'y')).toEqual(m4.applyAll(cube, ['Uw', "Dw'"]))
    expect(m4.apply(cube, 'z')).toEqual(m4.applyAll(cube, ['Fw', "Bw'"]))
  })

  it('maps drags to layers', () => {
    expect(m4.dragMove(1, 3, -1)).toBe('U')
    expect(m4.dragMove(1, 2, -1)).toBe('2U')
    expect(m4.dragMove(1, 1, -1)).toBe("2D'")
    expect(m4.dragMove(1, 0, -1)).toBe("D'")
    expect(m4.dragMove(0, 3, -1)).toBe('R')
    expect(m4.dragMove(0, 2, -1)).toBe('2R')
    expect(m4.dragMove(0, 1, -1)).toBe("2L'")
    expect(m4.dragMove(0, 0, -1)).toBe("L'")
  })
})

describe.each([m3, m4])('generic behaviour for n = $n', (model) => {
  it('has order 4 / 2 for every move', () => {
    const cube = randomMix(model, 21)
    for (const move of model.moves) {
      const times = move.endsWith('2') ? 2 : 4
      expect(model.applyAll(cube, Array(times).fill(move))).toEqual(cube)
      expect(model.applyAll(cube, Array(times - 1).fill(move))).not.toEqual(cube)
    }
  })

  it('inverts every move', () => {
    const cube = randomMix(model, 22)
    for (const move of model.moves) {
      expect(model.applyAll(cube, [move, model.invert(move)])).toEqual(cube)
    }
  })

  it("(R U R' U') x6 is identity", () => {
    const algorithm = model.parse("R U R' U'")
    expect(model.applyAll(model.solved, Array(6).fill(algorithm).flat())).toEqual(model.solved)
  })

  it('scrambles never repeat a face letter', () => {
    const rng = mulberry32(99)
    for (let i = 0; i < 40; i++) {
      const moves = model.scramble(40, rng)
      moves.forEach((m, j) => {
        expect(model.moves).toContain(m)
        if (j > 0) expect(m.replace(/^2/, '')[0]).not.toBe(moves[j - 1].replace(/^2/, '')[0])
      })
    }
  })

  it('parses and rejects', () => {
    expect(model.parse(" R  U' ")).toEqual(['R', "U'"])
    expect(() => model.parse('R Q')).toThrow()
    expect(() => model.spec('nope')).toThrow()
  })

  it('moves stickers exactly as the geometric rotation says', () => {
    const k = model.n - 1
    const idCube = Array.from({ length: model.solved.length }, (_, i) => i) as unknown as Cube
    const index = new Map(
      model.stickers.map((s, i) => [`${s.cell.map((c) => 2 * c - k)}|${s.normal}`, i]),
    )
    const rotate = (v: Vec, axis: Vec, angle: number): Vec => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const d = axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2]
      const c: Vec = [
        axis[1] * v[2] - axis[2] * v[1],
        axis[2] * v[0] - axis[0] * v[2],
        axis[0] * v[1] - axis[1] * v[0],
      ]
      return [0, 1, 2].map((i) => Math.round(v[i] * cos + c[i] * sin + axis[i] * d * (1 - cos)) + 0) as unknown as Vec
    }
    for (const move of model.moves) {
      const spec = model.spec(move)
      const { axis, angle } = turnRotation(spec)
      const result = model.apply(idCube, move) as unknown as number[]
      model.stickers.forEach((s, i) => {
        if (!inTurn(model.n, spec, s.cell)) {
          expect(result[i]).toBe(i)
          return
        }
        const p2: Vec = [2 * s.cell[0] - k, 2 * s.cell[1] - k, 2 * s.cell[2] - k]
        const j = index.get(`${rotate(p2, axis, angle)}|${rotate(s.normal, axis, angle)}`)!
        expect(result[j]).toBe(i)
      })
    }
  })
})
