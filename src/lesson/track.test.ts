import { describe, expect, it } from 'vitest'
import { SOLVED, applyMoves, getModel, mulberry32, randomScramble, type Cube } from '../core'
import { applyUserMove, assistMove, remainingMoves } from './track'

const model = getModel(3)
const m4 = getModel(4)
const base: Cube = applyMoves(SOLVED, randomScramble(25, mulberry32(4)))
const base4: Cube = m4.applyAll(m4.solved, m4.scramble(40, mulberry32(11)))

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
    expect(play(next, ['F']).extra).toEqual(['F'])
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

describe('assistMove', () => {
  it('widens a single-layer drag inside a wide move', () => {
    expect(assistMove(m4, "Dw'", "D'")).toBe("Dw'")
    expect(assistMove(m4, "Dw'", "2D'")).toBe("Dw'")
    expect(assistMove(m4, "Dw'", 'D')).toBe('Dw')
    expect(assistMove(m4, 'Rw2', '2R')).toBe('Rw')
  })

  it('leaves other drags alone', () => {
    expect(assistMove(m4, "Dw'", 'U')).toBe('U')
    expect(assistMove(m4, 'R', 'R')).toBe('R')
    expect(assistMove(m4, 'y', 'U')).toBe('U')
    expect(assistMove(model, 'F2', 'F')).toBe('F')
  })
})

describe('remainingMoves', () => {
  it('finds the missing layer', () => {
    expect(remainingMoves(m4, m4.apply(base4, "D'"), m4.apply(base4, "Dw'"), "Dw'")).toEqual(["2D'"])
    expect(remainingMoves(m4, m4.apply(base4, 'Rw'), m4.apply(base4, 'Rw2'), 'Rw2')).toEqual(['Rw'])
    expect(remainingMoves(m4, m4.apply(base4, 'F'), m4.apply(base4, 'F2'), 'F2')).toEqual(['F'])
    expect(remainingMoves(m4, m4.apply(base4, "R'"), m4.apply(base4, 'R'), 'R')).toEqual(['R2'])
    expect(remainingMoves(model, model.apply(base, 'F'), model.apply(base, 'F2'), 'F2')).toEqual(['F'])
  })

  it('finds a two-move completion', () => {
    const displayed = m4.apply(base4, 'R')
    const next = m4.apply(base4, 'Rw2')
    const result = remainingMoves(m4, displayed, next, 'Rw2')
    expect(result).toHaveLength(2)
    expect(m4.applyAll(displayed, result!)).toEqual(next)
  })

  it('gives null for another axis', () => {
    expect(remainingMoves(m4, m4.apply(base4, 'U'), m4.apply(base4, 'R'), 'R')).toBeNull()
  })
})
