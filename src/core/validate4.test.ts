import { describe, expect, it } from 'vitest'
import { mulberry32, type Cube } from './cube'
import { getModel } from './model'
import { solve4 } from './solver4'
import { validate4 } from './validate4'

const m4 = getModel(4)

function randomState(seed: number, length = 40): Cube {
  const rng = mulberry32(seed)
  const moves: string[] = []
  for (let i = 0; i < length; i++) moves.push(m4.moves[Math.floor(rng() * m4.moves.length)])
  return m4.applyAll(m4.solved, moves)
}

function swap(cube: Cube, a: number, b: number): Cube {
  const next = [...cube]
  next[a] = cube[b]
  next[b] = cube[a]
  return next
}

const cellOf = (index: number) => m4.stickers[index].cell.join(',')
const extremes = (index: number) => m4.stickers[index].cell.filter((v) => v === 0 || v === 3).length

function stickersOfCubie(kind: number, which: number): number[] {
  const groups = new Map<string, number[]>()
  m4.stickers.forEach((_, i) => {
    if (extremes(i) !== kind) return
    const key = cellOf(i)
    groups.set(key, [...(groups.get(key) ?? []), i])
  })
  return [...groups.values()][which]
}

describe('validate4', () => {
  it('accepts solved and 200 random states', () => {
    expect(validate4(m4.solved)).toEqual([])
    for (let seed = 0; seed < 200; seed++) expect(validate4(randomState(seed + 1))).toEqual([])
  })

  it('detects an exchanged wing', () => {
    for (let seed = 0; seed < 12; seed++) {
      const [a, b] = stickersOfCubie(2, seed)
      expect(validate4(swap(randomState(seed + 500), a, b))).toEqual([{ kind: 'wings' }])
    }
  })

  it('detects a twisted corner', () => {
    for (let seed = 0; seed < 8; seed++) {
      const [a, b, c] = stickersOfCubie(3, seed)
      const base = randomState(seed + 600)
      const next = [...base]
      next[a] = base[b]
      next[b] = base[c]
      next[c] = base[a]
      expect(validate4(next)).toEqual([{ kind: 'cornerTwist' }])
    }
  })

  it('detects an exchanged corner', () => {
    for (let seed = 0; seed < 8; seed++) {
      const [a, b] = stickersOfCubie(3, seed)
      expect(validate4(swap(randomState(seed + 700), a, b))).toEqual([{ kind: 'corners' }])
    }
  })

  it('reports only colour counts for a recoloured sticker', () => {
    const base = randomState(800)
    const next = [...base]
    next[0] = next[0] === 'U' ? 'R' : 'U'
    const errors = validate4(next)
    expect(errors.length).toBeGreaterThan(0)
    for (const error of errors) expect(error.kind).toBe('colourCount')
  })

  it('throws on wrong length', () => {
    expect(() => validate4(m4.solved.slice(0, 95))).toThrow()
  })

  it('is sound against solve4 on random sticker exchanges', () => {
    const rng = mulberry32(2024)
    let rejected = 0
    let solved = 0
    for (let k = 0; k < 300; k++) {
      const base = randomState(k + 3000)
      let a = Math.floor(rng() * 96)
      let b = Math.floor(rng() * 96)
      while (base[a] === base[b]) {
        a = Math.floor(rng() * 96)
        b = Math.floor(rng() * 96)
      }
      const cube = swap(base, a, b)
      if (validate4(cube).length > 0) {
        rejected++
        continue
      }
      const solution = solve4(cube)
      expect(m4.isSolved(m4.applyAll(cube, solution.moves))).toBe(true)
      solved++
    }
    console.log('soundness rejected', rejected, 'solved', solved)
    expect(rejected + solved).toBe(300)
  }, 300000)
})
