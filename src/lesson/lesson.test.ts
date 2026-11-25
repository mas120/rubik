import { describe, expect, it } from 'vitest'
import {
  MOVES,
  SOLVED,
  applyMoves,
  isSolved,
  mulberry32,
  randomScramble,
  solve,
  type Cube,
  type StageId,
} from '../core'
import { buildLesson, cubeAt } from './lesson'
import {
  ALG_NAME,
  CASE_TEXT,
  MOVE_DESC,
  STAGE_ORDER,
  STAGE_TEXT,
  explainStep,
} from './texts'

function scramble(seed: number): Cube {
  return applyMoves(SOLVED, randomScramble(25, mulberry32(seed)))
}

describe('buildLesson', () => {
  it('builds ordered items', () => {
    for (let seed = 0; seed < 100; seed++) {
      const cube = scramble(seed)
      const solution = solve(cube)
      const items = buildLesson(solution)
      const moves = items.flatMap((i) => (i.type === 'move' ? [i] : []))
      expect(moves.map((m) => m.move)).toEqual(solution.moves)
      expect(moves.map((m) => m.moveIndex)).toEqual(solution.moves.map((_, i) => i))
      expect(items.at(-1)).toEqual({ type: 'done' })

      const intros = items.flatMap((item, index) => (item.type === 'intro' ? [{ item, index }] : []))
      const present = STAGE_ORDER.filter((s) => solution.steps.some((st) => st.stage === s))
      expect(intros.map((i) => i.item.stage)).toEqual(present)
      for (const { item, index } of intros) {
        const next = items[index + 1]
        expect(next.type).toBe('move')
        if (next.type === 'move') expect(solution.steps[next.stepIndex].stage).toBe(item.stage)
      }
      const last = items[items.length - 1]
      expect(last.type).toBe('done')
      expect(isSolved(cubeAt(cube, solution, items, items.length - 1))).toBe(true)
    }
  })

  it('gives only done for a solved cube', () => {
    expect(buildLesson(solve(SOLVED))).toEqual([{ type: 'done' }])
  })

  it('cubeAt follows the cursor', () => {
    const cube = scramble(5)
    const solution = solve(cube)
    const items = buildLesson(solution)
    let expected = cube
    items.forEach((item, cursor) => {
      expect(cubeAt(cube, solution, items, cursor)).toEqual(expected)
      if (item.type === 'move') expected = applyMoves(expected, [item.move])
    })
  })
})

describe('texts', () => {
  it('explains every emitted case', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      for (const step of solve(scramble(seed)).steps) {
        seen.add(`${step.stage}/${step.caseId}`)
        expect(CASE_TEXT[step.caseId], step.caseId).toBeDefined()
        expect(explainStep(step)).toBeTruthy()
        expect(explainStep(step)).not.toMatch(/\{|undefined/)
      }
    }
    expect(seen.size).toBeGreaterThan(15)
  })

  it('describes every move', () => {
    for (const move of MOVES) expect(MOVE_DESC[move]).toBeTruthy()
  })

  it('has titles, goals and alg names', () => {
    const stages: StageId[] = [...STAGE_ORDER]
    for (const s of stages) {
      expect(STAGE_TEXT[s].title).toBeTruthy()
      expect(STAGE_TEXT[s].goal).toBeTruthy()
    }
    for (const name of Object.values(ALG_NAME)) expect(name).toBeTruthy()
    expect(Object.keys(ALG_NAME)).toHaveLength(7)
  })
})
