import { describe, expect, it } from 'vitest'
import {
  MOVES,
  SOLVED,
  applyMoves,
  getModel,
  isSolved,
  locatePiece,
  mulberry32,
  randomScramble,
  solve,
  ALGS4,
  type Cube,
  type StageId,
} from '../core'
import {
  buildItems,
  buildPlan3,
  buildPlan4,
  cubeAt,
  describeMove,
  focusAt,
  fullStageKeys,
} from './plan'
import { STAGES4 } from './texts4'
import {
  ALG_NAME,
  CASE_TEXT,
  MOVE_DESC,
  STAGE_ORDER,
  STAGE_TEXT,
  explainStep,
} from './texts'
import { FIRST_3X3_PREFIX } from './texts4'

const m3 = getModel(3)
const m4 = getModel(4)

function scramble(seed: number): Cube {
  return applyMoves(SOLVED, randomScramble(25, mulberry32(seed)))
}

function scramble4(seed: number): Cube {
  return m4.applyAll(m4.solved, m4.scramble(40, mulberry32(seed)))
}

describe('buildPlan3', () => {
  it('reproduces the 3x3 lesson', () => {
    for (let seed = 0; seed < 20; seed++) {
      const cube = scramble(seed)
      const solution = solve(cube)
      const plan = buildPlan3(cube)
      const items = buildItems(plan)
      const moves = items.flatMap((i) => (i.type === 'move' ? [i] : []))
      const intros = items.filter((i) => i.type === 'intro')
      expect(items).toHaveLength(solution.moves.length + intros.length + 1)
      expect(moves.map((m) => m.move)).toEqual(solution.moves)
      expect(plan.moves).toEqual(solution.moves)
      expect(moves.map((m) => m.moveIndex)).toEqual(solution.moves.map((_, i) => i))
      expect(items.at(-1)).toEqual({ type: 'done' })
      expect(intros.map((i) => i.stage)).toEqual(
        STAGE_ORDER.filter((s) => solution.steps.some((st) => st.stage === s)),
      )
      expect(plan.stages.map((s) => s.key)).toEqual(intros.map((i) => i.stage))
      solution.steps.forEach((step, index) => {
        expect(plan.steps[index].explain).toBe(explainStep(step))
        expect(plan.steps[index].setup).toEqual(step.setup)
        expect(plan.steps[index].alg).toEqual(step.alg)
        expect(plan.steps[index].cleanup).toEqual([])
        expect(plan.steps[index].algLabel).toBe(
          step.algId ? `${ALG_NAME[step.algId]} × ${step.repeat}` : null,
        )
      })
      expect(isSolved(cubeAt(plan, items, items.length - 1))).toBe(true)
      let expected: Cube = cube
      items.forEach((item, cursor) => {
        expect(cubeAt(plan, items, cursor)).toEqual(expected)
        if (item.type !== 'move') {
          expect(focusAt(plan, items, cursor)).toEqual([])
          return
        }
        const step = solution.steps[item.stepIndex]
        const focus = focusAt(plan, items, cursor)
        if (step.piece) {
          const slot = locatePiece(expected, step.piece)!
          expect([...focus].sort((a, b) => a - b)).toEqual([...slot.facelets].sort((a, b) => a - b))
        } else {
          expect(focus).toEqual([])
        }
        expected = m3.apply(expected, item.move)
      })
    }
  })

  it('gives only done for a solved cube', () => {
    expect(buildItems(buildPlan3(SOLVED))).toEqual([{ type: 'done' }])
  })
})

describe('buildPlan4', () => {
  it('builds consistent 4x4 plans', () => {
    for (let seed = 0; seed < 30; seed++) {
      const cube = scramble4(seed + 300)
      const plan = buildPlan4(cube)
      const items = buildItems(plan)
      const keys = fullStageKeys(4)
      expect(keys).toHaveLength(12)
      expect(plan.stages.map((s) => s.key)).toEqual(keys.filter((k) => plan.steps.some((s) => s.stage === k)))
      const firstThree = plan.stages.find((s) => !(STAGES4 as readonly string[]).includes(s.key))
      if (firstThree) expect(firstThree.goal.startsWith(FIRST_3X3_PREFIX)).toBe(true)
      expect(plan.stages.filter((s) => s.goal.includes(FIRST_3X3_PREFIX))).toHaveLength(firstThree ? 1 : 0)
      for (const step of plan.steps) {
        expect(step.explain).toBeTruthy()
        expect(step.explain).not.toMatch(/\{|undefined/)
        for (const move of [...step.setup, ...step.alg, ...step.cleanup]) {
          expect(describeMove(4, move), move).toBeTruthy()
        }
      }
      expect(m4.isSolved(cubeAt(plan, items, items.length - 1))).toBe(true)
      items.forEach((item, cursor) => {
        if (item.type !== 'move') return
        const focus = focusAt(plan, items, cursor)
        expect(focus).toHaveLength(plan.steps[item.stepIndex].focus.length)
        for (const index of focus) {
          expect(index).toBeGreaterThanOrEqual(0)
          expect(index).toBeLessThan(96)
        }
      })
    }
  }, 120000)

  it('lists the formulas in 4x4 stage intros', () => {
    const edgesPlan = buildPlan4(scramble4(300))
    const edges = edgesPlan.stages.find((s) => s.key === 'edges')!
    expect(edges.algs).toEqual([{ name: 'Ghép cạnh', notation: ALGS4.pairLast.join(' ') }])
    const oll = buildPlan4(m4.applyAll(m4.solved, ALGS4.ollParity)).stages.find((s) => s.key === 'parityOll')!
    expect(oll.algs).toEqual([{ name: 'Lật cạnh (đặc biệt 1)', notation: ALGS4.ollParity.join(' ') }])
    const pll = buildPlan4(m4.applyAll(m4.solved, ALGS4.pllParity)).stages.find((s) => s.key === 'parityPll')!
    expect(pll.algs).toEqual([{ name: 'Đổi hai cạnh (đặc biệt 2)', notation: ALGS4.pllParity.join(' ') }])
    expect(edgesPlan.stages.find((s) => s.key === 'centres')!.algs).toEqual([])
  }, 120000)

  it('describes all 63 moves', () => {
    expect(m4.moves).toHaveLength(63)
    for (const move of m4.moves) expect(describeMove(4, move), move).toBeTruthy()
    expect(describeMove(4, 'Rw')).toBe('Hai lớp phải — đẩy lên')
    expect(describeMove(4, "2L'")).toBe('Lớp trong bên trái — đẩy lên')
    expect(describeMove(4, 'Uw2')).toBe('Hai tầng trên — nửa vòng')
    expect(describeMove(4, '2R2')).toBe('Lớp trong bên phải — nửa vòng')
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
