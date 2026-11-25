import { describe, expect, it } from 'vitest'
import { SOLVED, applyMoves, getModel, mulberry32, randomScramble, type Cube } from '../core'
import { applyUserMove, isHalfTurnPartial } from './track'

const model = getModel(3)
const base: Cube = applyMoves(SOLVED, randomScramble(25, mulberry32(4)))

function play(next: Cube | null, moves: string[]) {
  let extra: string[] = []
  const advances: boolean[] = []
  for (const move of moves) {
    const result = applyUserMove(model, base, next, extra, move)
    extra = result.extra
    advances.push(result.advance)
  }
  return { extra, advances }
}

describe('applyUserMove', () => {
  it('advances on the expected move', () => {
    expect(play(model.apply(base, 'R'), ['R'])).toEqual({ extra: [], advances: [true] })
  })

  it('tracks a wrong move and its undo', () => {
    const next = model.apply(base, 'R')
    expect(play(next, ["R'"])).toEqual({ extra: ["R'"], advances: [false] })
    expect(play(next, ["R'", 'R'])).toEqual({ extra: [], advances: [false, false] })
  })

  it('handles half turns made of two quarter turns', () => {
    const next = model.apply(base, 'F2')
    const first = play(next, ['F'])
    expect(first.extra).toEqual(['F'])
    expect(isHalfTurnPartial('F2', first.extra)).toBe(true)
    expect(play(next, ['F', 'F']).advances).toEqual([false, true])
    expect(play(next, ["F'", "F'"]).advances).toEqual([false, true])
  })

  it('accepts equivalent sequences', () => {
    const next = model.apply(base, 'y')
    expect(play(next, ['U', "E'", "D'"]).advances).toEqual([false, false, true])
  })

  it('pops the last extra move when inverted', () => {
    expect(applyUserMove(model, base, null, ['U', 'R'], "R'").extra).toEqual(['U'])
  })

  it('never advances without a next state', () => {
    expect(play(null, ['R', "R'", 'U']).advances).toEqual([false, false, false])
  })
})

describe('isHalfTurnPartial', () => {
  it('rejects other situations', () => {
    expect(isHalfTurnPartial('R', ["R'"])).toBe(false)
    expect(isHalfTurnPartial('F2', ['U'])).toBe(false)
    expect(isHalfTurnPartial('F2', ['F', 'F'])).toBe(false)
    expect(isHalfTurnPartial('F2', [])).toBe(false)
  })
})
