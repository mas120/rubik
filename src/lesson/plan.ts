import { pieceLabel } from '../colors'
import {
  ALGS,
  formatMoves,
  getModel,
  locatePiece,
  solve,
  solve4,
  type Cube,
  type Move,
  type StageId,
} from '../core'
import {
  ALG_NAME,
  CASE_TEXT,
  MOVE_DESC,
  STAGE_ALGS,
  STAGE_ORDER,
  STAGE_TEXT,
} from './texts'
import { ALG_LABEL4, FIRST_3X3_PREFIX, MOVE_DESC4, STAGES4, STAGE_TEXT4, explain4 } from './texts4'

export interface PlanStage {
  key: string
  title: string
  goal: string
  algs: { name: string; notation: string }[]
}

export interface PlanStep {
  stage: string
  explain: string
  setup: string[]
  alg: string[]
  cleanup: string[]
  algLabel: string | null
  focus: number[]
}

export interface LessonPlan {
  n: 3 | 4
  initial: Cube
  stages: PlanStage[]
  steps: PlanStep[]
  moves: string[]
}

export type LessonItem =
  | { type: 'intro'; stage: string }
  | {
      type: 'move'
      stepIndex: number
      phase: 'setup' | 'alg' | 'cleanup'
      indexInPhase: number
      move: string
      moveIndex: number
    }
  | { type: 'done' }

export function fullStageKeys(n: 3 | 4): string[] {
  return n === 3 ? [...STAGE_ORDER] : [...STAGES4, ...STAGE_ORDER]
}

function stage3Info(stage: StageId, prefix: string): PlanStage {
  return {
    key: stage,
    title: STAGE_TEXT[stage].title,
    goal: prefix + STAGE_TEXT[stage].goal,
    algs: STAGE_ALGS[stage].map((id) => ({ name: ALG_NAME[id], notation: formatMoves(ALGS[id]) })),
  }
}

function explain3(caseId: string, piece: string | null, repeat: number): string {
  const text = CASE_TEXT[caseId]
  return text ? text(piece ? pieceLabel(piece) : '', repeat) : ''
}

function algLabel3(algId: string | null, repeat: number): string | null {
  if (!algId) return null
  const name = ALG_NAME[algId as keyof typeof ALG_NAME]
  return name ? `${name} × ${repeat}` : null
}

export function buildPlan3(cube: Cube): LessonPlan {
  const solution = solve(cube)
  const model = getModel(3)
  const steps: PlanStep[] = []
  let state = cube
  for (const step of solution.steps) {
    steps.push({
      stage: step.stage,
      explain: explain3(step.caseId, step.piece, step.repeat),
      setup: [...step.setup],
      alg: [...step.alg],
      cleanup: [],
      algLabel: algLabel3(step.algId, step.repeat),
      focus: step.piece ? [...(locatePiece(state, step.piece)?.facelets ?? [])] : [],
    })
    state = model.applyAll(state, [...step.setup, ...step.alg])
  }
  const present = STAGE_ORDER.filter((stage) => steps.some((step) => step.stage === stage))
  return {
    n: 3,
    initial: cube,
    stages: present.map((stage) => stage3Info(stage, '')),
    steps,
    moves: solution.moves as string[],
  }
}

export function buildPlan4(cube: Cube): LessonPlan {
  const solution = solve4(cube)
  const steps: PlanStep[] = solution.steps.map((step) => {
    const is4 = (STAGES4 as readonly string[]).includes(step.stage)
    const algId = step.algId
    return {
      stage: step.stage,
      explain: is4
        ? (explain4(step.caseId, step.target) ?? '')
        : explain3(step.caseId, step.piece, step.repeat),
      setup: [...step.setup],
      alg: [...step.alg],
      cleanup: [...step.cleanup],
      algLabel: is4 ? (algId ? (ALG_LABEL4[algId] ?? null) : null) : algLabel3(algId, step.repeat),
      focus: [...step.focus],
    }
  })
  const keys = fullStageKeys(4).filter((key) => steps.some((step) => step.stage === key))
  let prefixed = false
  const stages = keys.map((key): PlanStage => {
    if ((STAGES4 as readonly string[]).includes(key)) {
      const text = STAGE_TEXT4[key as (typeof STAGES4)[number]]
      return { key, title: text.title, goal: text.goal, algs: [] }
    }
    const info = stage3Info(key as StageId, prefixed ? '' : FIRST_3X3_PREFIX)
    prefixed = true
    return info
  })
  return { n: 4, initial: cube, stages, steps, moves: solution.moves }
}

export function describeMove(n: 3 | 4, move: string): string {
  return n === 3 ? MOVE_DESC[move as Move] : MOVE_DESC4[move]
}

export function buildItems(plan: LessonPlan): LessonItem[] {
  const items: LessonItem[] = []
  let moveIndex = 0
  let stage: string | null = null
  plan.steps.forEach((step, stepIndex) => {
    if (step.stage !== stage) {
      stage = step.stage
      items.push({ type: 'intro', stage })
    }
    const phases = [
      ['setup', step.setup],
      ['alg', step.alg],
      ['cleanup', step.cleanup],
    ] as const
    for (const [phase, moves] of phases) {
      moves.forEach((move, indexInPhase) => {
        items.push({ type: 'move', stepIndex, phase, indexInPhase, move, moveIndex: moveIndex++ })
      })
    }
  })
  items.push({ type: 'done' })
  return items
}

function performed(items: readonly LessonItem[], cursor: number): number {
  let count = 0
  for (let i = 0; i < cursor; i++) if (items[i].type === 'move') count++
  return count
}

export function cubeAt(plan: LessonPlan, items: readonly LessonItem[], cursor: number): Cube {
  return getModel(plan.n).applyAll(plan.initial, plan.moves.slice(0, performed(items, cursor)))
}

export function focusAt(plan: LessonPlan, items: readonly LessonItem[], cursor: number): number[] {
  const item = items[cursor]
  if (!item || item.type !== 'move') return []
  const step = plan.steps[item.stepIndex]
  if (step.focus.length === 0) return []
  const done: string[] = []
  for (let i = 0; i < cursor; i++) {
    const previous = items[i]
    if (previous.type === 'move' && previous.stepIndex === item.stepIndex) done.push(previous.move)
  }
  if (done.length === 0) return [...step.focus]
  const model = getModel(plan.n)
  const size = plan.initial.length
  const ids = Array.from({ length: size }, (_, i) => i) as unknown as Cube
  const moved = model.applyAll(ids, done) as unknown as number[]
  const where = new Map<number, number>()
  moved.forEach((original, position) => where.set(original, position))
  return step.focus.map((index) => where.get(index) ?? index)
}
