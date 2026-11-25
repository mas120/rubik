import { describe, expect, it } from 'vitest'
import {
  FACES,
  MOVES,
  SOLVED,
  applyMove,
  applyMoves,
  cubeFromString,
  cubeToString,
  formatMoves,
  invertMoves,
  isSolved,
  mulberry32,
  parseMoves,
  randomScramble,
  type Cube,
  type Move,
} from './cube'

const FACE_MOVES = MOVES.filter((m) => !m.startsWith('y'))

function faceStrings(cube: Cube): string {
  return FACES.map((f, i) => `${f}=${cube.slice(i * 9, i * 9 + 9).join('')}`).join(' ')
}

function scrambled(seed: number): Cube {
  return applyMoves(SOLVED, randomScramble(30, mulberry32(seed)))
}

describe('move tables', () => {
  it.each([
    ['R', 'U=UUFUUFUUF R=RRRRRRRRR F=FFDFFDFFD D=DDBDDBDDB L=LLLLLLLLL B=UBBUBBUBB'],
    ['U', 'U=UUUUUUUUU R=BBBRRRRRR F=RRRFFFFFF D=DDDDDDDDD L=FFFLLLLLL B=LLLBBBBBB'],
    ['F', 'U=UUUUUULLL R=URRURRURR F=FFFFFFFFF D=RRRDDDDDD L=LLDLLDLLD B=BBBBBBBBB'],
    ['D', 'U=UUUUUUUUU R=RRRRRRFFF F=FFFFFFLLL D=DDDDDDDDD L=LLLLLLBBB B=BBBBBBRRR'],
    ['y', 'U=UUUUUUUUU R=BBBBBBBBB F=RRRRRRRRR D=DDDDDDDDD L=FFFFFFFFF B=LLLLLLLLL'],
  ] as const)('%s on SOLVED', (move, expected) => {
    expect(faceStrings(applyMove(SOLVED, move))).toBe(expected)
  })

  it('has 21 moves', () => {
    expect(MOVES).toHaveLength(21)
  })

  it.each(MOVES)('%s has the right order', (move) => {
    const times = move.endsWith('2') ? 2 : 4
    expect(applyMoves(SOLVED, Array<Move>(times).fill(move))).toEqual(SOLVED)
    expect(applyMoves(SOLVED, Array<Move>(times - 1).fill(move))).not.toEqual(SOLVED)
  })

  it.each(MOVES)('%s followed by its inverse is identity', (move) => {
    const cube = scrambled(7)
    expect(applyMoves(cube, [move, ...invertMoves([move])])).toEqual(cube)
  })

  it('R U R\' U\' has order 6', () => {
    const sexy = parseMoves("R U R' U'")
    let cube: Cube = SOLVED
    for (let i = 0; i < 6; i++) cube = applyMoves(cube, sexy)
    expect(cube).toEqual(SOLVED)
  })

  it('R U has order 105', () => {
    let cube: Cube = SOLVED
    for (let i = 1; i <= 105; i++) {
      cube = applyMoves(cube, ['R', 'U'])
      if (i < 105) expect(isSolved(cube) && cube.join('') === SOLVED.join('')).toBe(false)
    }
    expect(cube).toEqual(SOLVED)
  })

  it('is consistent with the rotation conjugations', () => {
    const cube = scrambled(11)
    const pairs: [Move, Move][] = [
      ['R', 'B'],
      ['B', 'L'],
      ['L', 'F'],
      ['F', 'R'],
      ['U', 'U'],
      ['D', 'D'],
    ]
    for (const [from, to] of pairs) {
      expect(applyMoves(cube, ['y', from, "y'"])).toEqual(applyMove(cube, to))
    }
  })

  it('y commutes with U', () => {
    const cube = scrambled(3)
    expect(applyMoves(cube, ['y', 'U'])).toEqual(applyMoves(cube, ['U', 'y']))
  })
})

describe('helpers', () => {
  it('round-trips parse and format', () => {
    const text = "R U R' U2 F' y2 D L2 B y'"
    expect(formatMoves(parseMoves(text))).toBe(text)
  })

  it('rejects unknown moves', () => {
    expect(() => parseMoves('R M')).toThrow()
  })

  it('round-trips strings', () => {
    const cube = scrambled(5)
    expect(cubeFromString(cubeToString(cube))).toEqual(cube)
    expect(cubeToString(SOLVED)).toHaveLength(54)
  })

  it('rejects bad strings', () => {
    expect(() => cubeFromString('UUU')).toThrow()
    expect(() => cubeFromString('X'.repeat(54))).toThrow()
  })

  it('isSolved ignores orientation', () => {
    expect(isSolved(SOLVED)).toBe(true)
    expect(isSolved(applyMove(SOLVED, 'y'))).toBe(true)
    expect(isSolved(applyMove(SOLVED, 'R'))).toBe(false)
  })

  it('inverts a sequence', () => {
    const moves = randomScramble(20, mulberry32(9))
    expect(applyMoves(applyMoves(SOLVED, moves), invertMoves(moves))).toEqual(SOLVED)
  })

  it('generates scrambles without repeated faces', () => {
    const rng = mulberry32(1)
    for (let n = 0; n < 50; n++) {
      const moves = randomScramble(25, rng)
      expect(moves).toHaveLength(25)
      moves.forEach((m, i) => {
        expect(FACE_MOVES).toContain(m)
        if (i > 0) expect(m[0]).not.toBe(moves[i - 1][0])
      })
    }
  })

  it('is deterministic for a seed', () => {
    expect(randomScramble(20, mulberry32(42))).toEqual(randomScramble(20, mulberry32(42)))
  })
})
