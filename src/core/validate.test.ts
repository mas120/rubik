import { describe, expect, it } from 'vitest'
import {
  SOLVED,
  applyMoves,
  invertMoves,
  mulberry32,
  randomScramble,
  type Cube,
  type Face,
} from './cube'
import { normalize, validate } from './validate'

function swap(cube: Cube, pairs: [number, number][]): Cube {
  const next = [...cube]
  for (const [a, b] of pairs) [next[a], next[b]] = [next[b], next[a]]
  return next
}

function pristine(seed: number): Cube {
  const scramble = randomScramble(25, mulberry32(seed))
  return applyMoves(applyMoves(SOLVED, scramble), invertMoves(scramble))
}

describe('normalize', () => {
  it('relabels by centres', () => {
    expect(normalize(applyMoves(SOLVED, ['y']))).toEqual(SOLVED)
  })

  it('returns null for duplicate centres', () => {
    const cube = [...SOLVED]
    cube[13] = 'U'
    expect(normalize(cube)).toBeNull()
  })
})

describe('validate', () => {
  it('accepts SOLVED', () => {
    expect(validate(SOLVED)).toEqual([])
  })

  it('accepts 200 seeded scrambles, also rotated', () => {
    const rng = mulberry32(2024)
    for (let i = 0; i < 200; i++) {
      const cube = applyMoves(SOLVED, randomScramble(25, rng))
      expect(validate(cube)).toEqual([])
      expect(validate(applyMoves(cube, ['y']))).toEqual([])
    }
  })

  it('flags a flipped edge', () => {
    expect(validate(swap(pristine(1), [[7, 19]]))).toEqual([{ kind: 'edgeFlip' }])
  })

  it('flags a twisted corner', () => {
    const cube = [...pristine(2)]
    const [a, b, c] = [cube[8], cube[9], cube[20]]
    ;[cube[9], cube[20], cube[8]] = [a, b, c]
    expect(validate(cube)).toEqual([{ kind: 'cornerTwist' }])
  })

  it('flags exchanged edges as parity', () => {
    expect(
      validate(
        swap(pristine(3), [
          [7, 5],
          [19, 10],
        ]),
      ),
    ).toEqual([{ kind: 'parity' }])
  })

  it('flags colour counts', () => {
    const cube = [...pristine(4)]
    cube[0] = 'D'
    const errors = validate(cube)
    expect(errors).toContainEqual({ kind: 'colourCount', colour: 'D', count: 10 })
    expect(errors).toContainEqual({ kind: 'colourCount', colour: 'U', count: 8 })
  })

  it('flags duplicate centres', () => {
    const cube: Face[] = [...SOLVED]
    cube[13] = 'U'
    expect(validate(cube).map((e) => e.kind)).toContain('centres')
  })

  it('flags impossible pieces', () => {
    expect(validate(swap(SOLVED, [[7, 25]])).map((e) => e.kind)).toEqual(['pieces'])
  })

  it('flags a mirrored corner', () => {
    const cube = [...SOLVED]
    ;[cube[9], cube[20]] = [cube[20], cube[9]]
    expect(validate(cube).map((e) => e.kind)).toEqual(['pieces'])
  })
})
