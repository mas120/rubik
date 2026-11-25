import { applyMoves, type Cube, type Move, type Solution, type StageId } from '../core'

export type LessonItem =
  | { type: 'intro'; stage: StageId }
  | {
      type: 'move'
      stepIndex: number
      phase: 'setup' | 'alg'
      indexInPhase: number
      move: Move
      moveIndex: number
    }
  | { type: 'done' }

export function buildLesson(solution: Solution): LessonItem[] {
  const items: LessonItem[] = []
  let moveIndex = 0
  let stage: StageId | null = null
  solution.steps.forEach((step, stepIndex) => {
    if (step.stage !== stage) {
      stage = step.stage
      items.push({ type: 'intro', stage })
    }
    const phases = [
      ['setup', step.setup],
      ['alg', step.alg],
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

export function cubeAt(initial: Cube, solution: Solution, items: LessonItem[], cursor: number): Cube {
  const performed = items.slice(0, cursor).filter((item) => item.type === 'move').length
  return applyMoves(initial, solution.moves.slice(0, performed))
}
