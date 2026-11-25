import { describe, expect, it } from 'vitest'
import {
  FACES,
  MOVES,
  SOLVED,
  applyMove,
  applyMoves,
  isSolved,
  mulberry32,
  randomScramble,
  toHomeOrientation,
  type Cube,
  type Move,
} from './cube'
import { ALGS, locatePiece, solve, stageDone, type Solution, type StageId, type Step } from './solver'

const STAGES: StageId[] = [
  'daisy',
  'cross',
  'firstLayerCorners',
  'middleEdges',
  'lastCross',
  'lastEdges',
  'lastCornersPosition',
  'lastCornersOrientation',
]

const ALLOWED_REPEATS: Record<string, number[]> = {
  cornerTop: [1, 3, 5],
  cornerTwisted: [2, 4],
  twist: [2, 4],
  onePlaced: [1, 2],
}

const SETUP_MOVES = ['U', "U'", 'U2', 'y', "y'", 'y2']

interface Sample {
  cube: Cube
  solution: Solution
}

function sample(): Sample[] {
  const rng = mulberry32(12345)
  return Array.from({ length: 2000 }, () => {
    const cube = applyMoves(SOLVED, randomScramble(25, rng))
    return { cube, solution: solve(cube) }
  })
}

const samples = sample()

function applications(steps: Step[], algId: string): number {
  return steps.filter((s) => s.algId === algId).reduce((sum, s) => sum + s.repeat, 0)
}

describe('solve', () => {
  it('solves 2000 scrambles', () => {
    for (const { cube, solution } of samples) {
      expect(isSolved(applyMoves(cube, solution.moves))).toBe(true)
      expect(solution.moves).toEqual(solution.steps.flatMap((s) => [...s.setup, ...s.alg]))
    }
  })

  it('emits well-formed steps', () => {
    for (const { solution } of samples) {
      let stageIndex = 0
      for (const step of solution.steps) {
        const index = STAGES.indexOf(step.stage)
        expect(index).toBeGreaterThanOrEqual(stageIndex)
        stageIndex = index
        for (const move of step.setup) expect(SETUP_MOVES).toContain(move)
        if (step.stage === 'lastCornersOrientation') {
          expect(step.setup.some((m) => m.startsWith('y'))).toBe(false)
        }
        if (step.algId !== null) {
          expect(step.repeat).toBeGreaterThanOrEqual(1)
          expect(step.alg).toEqual(Array.from({ length: step.repeat }, () => ALGS[step.algId!]).flat())
          const allowed = ALLOWED_REPEATS[step.caseId] ?? [1]
          expect(allowed).toContain(step.repeat)
        } else {
          expect(step.repeat).toBe(1)
        }
        expect(step.setup.length + step.alg.length).toBeGreaterThan(0)
        if (step.alg.length === 0) expect(['align', 'finalAlign']).toContain(step.caseId)
      }
    }
  })

  it('has simplified setups', () => {
    for (const { solution } of samples) {
      for (const { setup } of solution.steps) {
        expect(setup.filter((m) => m.startsWith('y')).length).toBeLessThanOrEqual(1)
        expect(setup.filter((m) => m.startsWith('U')).length).toBeLessThanOrEqual(1)
      }
    }
  })

  it('completes every stage in order', () => {
    for (const { cube, solution } of samples) {
      let current = cube
      let cursor = 0
      for (const stage of STAGES) {
        const stageSteps: Step[] = []
        while (cursor < solution.steps.length && solution.steps[cursor].stage === stage) {
          stageSteps.push(solution.steps[cursor++])
        }
        if (stageSteps.length === 0) {
          expect(stageDone(current, stage)).toBe(true)
          continue
        }
        for (const step of stageSteps) current = applyMoves(current, [...step.setup, ...step.alg])
        expect(stageDone(current, stage)).toBe(true)
        for (const earlier of STAGES.slice(1, STAGES.indexOf(stage))) {
          expect(stageDone(current, earlier)).toBe(true)
        }
      }
      expect(cursor).toBe(solution.steps.length)
    }
  })

  it('stays within observed bounds', () => {
    let maxMoves = 0
    for (const { solution } of samples) {
      maxMoves = Math.max(maxMoves, solution.moves.length)
      expect(applications(solution.steps, 'lastCross')).toBeLessThanOrEqual(3)
      expect(applications(solution.steps, 'edgeSwap')).toBeLessThanOrEqual(2)
      expect(applications(solution.steps, 'cornerCycle')).toBeLessThanOrEqual(3)
    }
    expect(maxMoves).toBeLessThanOrEqual(250)
  })

  it('keeps a home orientation after any prefix', () => {
    for (const { cube, solution } of samples.slice(0, 200)) {
      for (const n of [0, 7, 40, 90, solution.moves.length]) {
        const mid = applyMoves(cube, solution.moves.slice(0, n))
        const { cube: home, rotation } = toHomeOrientation(mid)
        expect(rotation.every((m) => m.startsWith('y'))).toBe(true)
        expect([4, 13, 22, 31, 40, 49].map((i) => home[i]).join('')).toBe('URFDLB')
      }
    }
  })

  it('finds a short rotation for all 24 orientations', () => {
    const base = samples[3].cube
    const rotations: Move[] = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2']
    const orientations = new Map<string, Cube>()
    let frontier: Cube[] = [base]
    for (let depth = 0; depth < 4; depth++) {
      frontier = frontier.flatMap((c) => rotations.map((m) => applyMove(c, m)))
      for (const c of frontier) orientations.set([4, 13, 22, 31, 40, 49].map((i) => c[i]).join(''), c)
    }
    orientations.set('URFDLB', base)
    expect(orientations.size).toBe(24)
    let longest = 0
    for (const rotated of orientations.values()) {
      const result = toHomeOrientation(rotated)
      expect(result.cube).toEqual(base)
      longest = Math.max(longest, result.rotation.length)
    }
    expect(longest).toBeLessThanOrEqual(2)
  })

  it('rejects duplicate centres in toHomeOrientation', () => {
    const cube = [...SOLVED]
    cube[13] = 'U'
    expect(() => toHomeOrientation(cube)).toThrow()
  })

  it('solves any cube reached with slices and rotations after reorienting', () => {
    const rng = mulberry32(777)
    for (let i = 0; i < 200; i++) {
      const moves = Array.from({ length: 30 }, () => MOVES[Math.floor(rng() * MOVES.length)])
      const cube = applyMoves(SOLVED, moves)
      const home = toHomeOrientation(cube).cube
      expect(isSolved(applyMoves(home, solve(home).moves))).toBe(true)
    }
  })

  it('locates pieces in any orientation', () => {
    expect(locatePiece(SOLVED, 'DF')?.name).toBe('DF')
    expect(locatePiece(applyMove(SOLVED, 'y'), 'DFR')?.name).toBe('DFL')
    expect(locatePiece(SOLVED, 'UD')).toBeNull()
    const { cube, solution } = samples[0]
    const start = locatePiece(cube, 'DFR')!
    expect(new Set(start.facelets.map((i) => cube[i]))).toEqual(new Set(['D', 'F', 'R']))
    expect(locatePiece(toHomeOrientation(applyMoves(cube, solution.moves)).cube, 'DFR')?.name).toBe('DFR')
  })

  it('returns no steps for SOLVED', () => {
    expect(solve(SOLVED)).toEqual({ steps: [], moves: [] })
  })

  it.each(FACES.flatMap((f) => [f, `${f}'`, `${f}2`] as const))('solves a single %s', (move) => {
    const cube = applyMove(SOLVED, move)
    const { moves } = solve(cube)
    expect(isSolved(applyMoves(cube, moves))).toBe(true)
  })

  it('rejects a non-normalised cube', () => {
    expect(() => solve(applyMove(applyMoves(SOLVED, ['R', 'U']), 'y'))).toThrow()
  })

  it('rejects an unsolvable cube', () => {
    const cube = [...SOLVED]
    ;[cube[7], cube[19]] = [cube[19], cube[7]]
    expect(() => solve(cube)).toThrow()
  })
})
