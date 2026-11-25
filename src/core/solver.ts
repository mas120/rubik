import {
  CORNER_SLOTS,
  EDGE_SLOTS,
  applyMoves,
  isSolved,
  type Cube,
  type Face,
  type Move,
  type Slot,
} from './cube'
import { normalize, validate } from './validate'

export type StageId =
  | 'daisy'
  | 'cross'
  | 'firstLayerCorners'
  | 'middleEdges'
  | 'lastCross'
  | 'lastEdges'
  | 'lastCornersPosition'
  | 'lastCornersOrientation'

export type AlgId =
  | 'sexy'
  | 'insertRight'
  | 'insertLeft'
  | 'lastCross'
  | 'edgeSwap'
  | 'cornerCycle'
  | 'cornerTwist'

export const ALGS: Record<AlgId, Move[]> = {
  sexy: ['R', 'U', "R'", "U'"],
  insertRight: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'],
  insertLeft: ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"],
  lastCross: ['F', 'R', 'U', "R'", "U'", "F'"],
  edgeSwap: ['R', 'U', "R'", 'U', 'R', 'U2', "R'", 'U'],
  cornerCycle: ['U', 'R', "U'", "L'", 'U', "R'", "U'", 'L'],
  cornerTwist: ["R'", "D'", 'R', 'D'],
}

export interface Step {
  stage: StageId
  caseId: string
  piece: string | null
  setup: Move[]
  algId: AlgId | null
  repeat: number
  alg: Move[]
}

export interface Solution {
  steps: Step[]
  moves: Move[]
}

const STAGE_ORDER: readonly StageId[] = [
  'daisy',
  'cross',
  'firstLayerCorners',
  'middleEdges',
  'lastCross',
  'lastEdges',
  'lastCornersPosition',
  'lastCornersOrientation',
]

const TURN_ORDER = [0, 1, 3, 2]
const MAX_ITERATIONS = 40

const slotByName = (slots: readonly Slot[], name: string): Slot => {
  const slot = slots.find((s) => s.name === name)
  if (!slot) throw new Error(`Unknown slot ${name}`)
  return slot
}

const EDGE = (name: string) => slotByName(EDGE_SLOTS, name)
const CORNER = (name: string) => slotByName(CORNER_SLOTS, name)

const U_EDGES = ['UF', 'UR', 'UB', 'UL'].map(EDGE)
const U_CORNERS = ['UFR', 'UFL', 'UBL', 'UBR'].map(CORNER)

const FACE_INDEX: Record<Face, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }
const PRIORITY: Record<Face, number> = { U: 0, D: 0, F: 1, B: 1, R: 2, L: 2 }

const centre = (cube: Cube, face: Face): Face => cube[FACE_INDEX[face] * 9 + 4]
const colours = (cube: Cube, slot: Slot): Face[] => slot.facelets.map((i) => cube[i])
const setKey = (faces: readonly Face[]) => [...faces].sort().join('')

function pieceName(faces: readonly Face[]): string {
  return [...faces].sort((a, b) => PRIORITY[a] - PRIORITY[b]).join('')
}

function slotSolved(cube: Cube, slot: Slot): boolean {
  return slot.facelets.every((index, i) => cube[index] === centre(cube, slot.faces[i]))
}

function centreColours(cube: Cube, slot: Slot): Face[] {
  return slot.faces.map((f) => centre(cube, f))
}

function slotHolding(cube: Cube, slots: readonly Slot[], faces: readonly Face[]): Slot {
  const key = setKey(faces)
  return slots.find((s) => setKey(colours(cube, s)) === key)!
}

function homeSlot(cube: Cube, slots: readonly Slot[], faces: readonly Face[]): Slot {
  const key = setKey(faces)
  return slots.find((s) => setKey(centreColours(cube, s)) === key)!
}

const turns = (axis: 'y' | 'U', n: number): Move[] => {
  const count = ((n % 4) + 4) % 4
  if (count === 0) return []
  return [(count === 1 ? axis : count === 2 ? `${axis}2` : `${axis}'`) as Move]
}

const turnCost = (n: number) => (n % 4 === 2 ? 2 : n % 4 === 0 ? 0 : 1)

const rotate = (cube: Cube, k: number) => applyMoves(cube, turns('y', k))
const turnTop = (cube: Cube, u: number) => applyMoves(cube, turns('U', u))
const repeated = (alg: readonly Move[], times: number): Move[] =>
  Array.from({ length: times }, () => alg).flat()

function petals(cube: Cube): Slot[] {
  return U_EDGES.filter((s) => cube[s.facelets[0]] === 'D')
}

function crossDone(cube: Cube): boolean {
  return ['DR', 'DF', 'DL', 'DB'].every((n) => slotSolved(cube, EDGE(n)))
}

function cornerPlaced(cube: Cube, slot: Slot): boolean {
  return setKey(colours(cube, slot)) === setKey(centreColours(cube, slot))
}

export function stageDone(cube: Cube, stage: StageId): boolean {
  switch (stage) {
    case 'daisy':
      return crossDone(cube) || petals(cube).length === 4
    case 'cross':
      return crossDone(cube)
    case 'firstLayerCorners':
      return ['DFR', 'DFL', 'DBL', 'DBR'].every((n) => slotSolved(cube, CORNER(n)))
    case 'middleEdges':
      return ['FR', 'FL', 'BL', 'BR'].every((n) => slotSolved(cube, EDGE(n)))
    case 'lastCross':
      return U_EDGES.every((s) => cube[s.facelets[0]] === 'U')
    case 'lastEdges':
      return U_EDGES.every((s) => cube[s.facelets[1]] === centre(cube, s.faces[1]))
    case 'lastCornersPosition':
      return U_CORNERS.every((s) => cornerPlaced(cube, s))
    case 'lastCornersOrientation':
      return isSolved(cube)
  }
}

interface Run {
  cube: Cube
  steps: Step[]
}

interface StepSpec {
  stage: StageId
  caseId: string
  piece: string | null
  y?: number
  u?: number
  algId?: AlgId
  repeat?: number
  alg?: Move[]
}

function emit(run: Run, spec: StepSpec): void {
  const setup = [...turns('y', spec.y ?? 0), ...turns('U', spec.u ?? 0)]
  const algId = spec.algId ?? null
  const repeat = algId ? (spec.repeat ?? 1) : 1
  const alg = algId ? repeated(ALGS[algId], repeat) : (spec.alg ?? [])
  run.steps.push({ stage: spec.stage, caseId: spec.caseId, piece: spec.piece, setup, algId, repeat, alg })
  run.cube = applyMoves(run.cube, [...setup, ...alg])
}

function guard(counter: { n: number }): void {
  if (++counter.n > MAX_ITERATIONS) throw new Error('Solver did not converge')
}

function solveDaisy(run: Run): void {
  const counter = { n: 0 }
  const dEdges: Face[][] = [['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B']]
  while (petals(run.cube).length < 4) {
    guard(counter)
    let best: { cost: number; spec: StepSpec } | null = null
    for (const faces of dEdges) {
      for (let k = 0; k < 4; k++) {
        const rotated = rotate(run.cube, k)
        const slot = slotHolding(rotated, EDGE_SLOTS, faces)
        const dIndex = colours(rotated, slot).indexOf('D')
        let caseId: string
        let free: string | null = null
        let alg: Move
        if (slot.name === 'UF' && dIndex === 1) {
          caseId = 'topFlipped'
          alg = 'F'
        } else if (slot.name === 'DF') {
          caseId = dIndex === 0 ? 'bottomDown' : 'bottomSide'
          free = 'UF'
          alg = dIndex === 0 ? 'F2' : "F'"
        } else if (slot.name === 'FR' && dIndex === 0) {
          caseId = 'midRight'
          free = 'UR'
          alg = 'R'
        } else if (slot.name === 'FL' && dIndex === 0) {
          caseId = 'midLeft'
          free = 'UL'
          alg = "L'"
        } else {
          continue
        }
        const terminal = caseId === 'midRight' || caseId === 'midLeft' || caseId === 'bottomDown'
        for (const u of TURN_ORDER) {
          if (free !== null) {
            const freeSlot = EDGE(free)
            if (turnTop(rotated, u)[freeSlot.facelets[0]] === 'D') continue
          } else if (u !== 0) {
            continue
          }
          const cost = turnCost(k) + turnCost(u) + (terminal ? 0 : 10)
          if (!best || cost < best.cost) {
            best = {
              cost,
              spec: { stage: 'daisy', caseId, piece: pieceName(faces), y: k, u, alg: [alg] },
            }
          }
          break
        }
      }
    }
    emit(run, best!.spec)
  }
}

function solveCross(run: Run): void {
  for (let n = 0; n < 4; n++) {
    let spec: StepSpec | null = null
    search: for (const u of TURN_ORDER) {
      for (const k of TURN_ORDER) {
        const c = turnTop(rotate(run.cube, k), u)
        const [up, side] = colours(c, EDGE('UF'))
        if (up === 'D' && side === centre(c, 'F')) {
          spec = { stage: 'cross', caseId: 'petalDown', piece: pieceName(['D', side]), y: k, u, alg: ['F2'] }
          break search
        }
      }
    }
    if (!spec) throw new Error('No petal can be lowered')
    emit(run, spec)
  }
}

function solveFirstLayerCorners(run: Run): void {
  const counter = { n: 0 }
  const dCorners: Face[][] = [
    ['D', 'F', 'R'],
    ['D', 'F', 'L'],
    ['D', 'B', 'L'],
    ['D', 'B', 'R'],
  ]
  while (!stageDone(run.cube, 'firstLayerCorners')) {
    guard(counter)
    let top: { cost: number; spec: StepSpec } | null = null
    let bottom: { cost: number; spec: StepSpec } | null = null
    for (const faces of dCorners) {
      for (let k = 0; k < 4; k++) {
        const rotated = rotate(run.cube, k)
        const slot = slotHolding(rotated, CORNER_SLOTS, faces)
        const home = homeSlot(rotated, CORNER_SLOTS, faces)
        if (slot.layer === 'D' && slot.name === home.name && slotSolved(rotated, slot)) continue
        const piece = pieceName(faces)
        if (slot.layer === 'U') {
          if (home.name !== 'DFR') continue
          for (const u of TURN_ORDER) {
            if (slotHolding(turnTop(rotated, u), CORNER_SLOTS, faces).name !== 'UFR') continue
            const cost = turnCost(k) + turnCost(u)
            if (!top || cost < top.cost) {
              const prepared = turnTop(rotated, u)
              const repeat = [1, 3, 5].find((r) =>
                slotSolved(applyMoves(prepared, repeated(ALGS.sexy, r)), CORNER('DFR')),
              )!
              top = {
                cost,
                spec: { stage: 'firstLayerCorners', caseId: 'cornerTop', piece, y: k, u, algId: 'sexy', repeat },
              }
            }
          }
        } else if (slot.name === 'DFR') {
          const twisted = home.name === 'DFR'
          const repeat = twisted
            ? [2, 4].find((r) => slotSolved(applyMoves(rotated, repeated(ALGS.sexy, r)), slot))!
            : 1
          const cost = turnCost(k)
          if (!bottom || cost < bottom.cost) {
            bottom = {
              cost,
              spec: {
                stage: 'firstLayerCorners',
                caseId: twisted ? 'cornerTwisted' : 'cornerWrongSlot',
                piece,
                y: k,
                algId: 'sexy',
                repeat,
              },
            }
          }
        }
      }
    }
    emit(run, (top ?? bottom)!.spec)
  }
}

function solveMiddleEdges(run: Run): void {
  const counter = { n: 0 }
  while (!stageDone(run.cube, 'middleEdges')) {
    guard(counter)
    let best: { cost: number; spec: StepSpec } | null = null
    for (const slot of U_EDGES) {
      const faces = colours(run.cube, slot)
      if (faces.includes('U')) continue
      for (const k of TURN_ORDER) {
        for (const u of TURN_ORDER) {
          const c = turnTop(rotate(run.cube, k), u)
          const [top, side] = colours(c, EDGE('UF'))
          if (setKey(colours(c, EDGE('UF'))) !== setKey(faces) || side !== centre(c, 'F')) continue
          const cost = turnCost(k) + turnCost(u)
          if (!best || cost < best.cost) {
            const right = top === centre(c, 'R')
            best = {
              cost,
              spec: {
                stage: 'middleEdges',
                caseId: right ? 'insertRight' : 'insertLeft',
                piece: pieceName(faces),
                y: k,
                u,
                algId: right ? 'insertRight' : 'insertLeft',
              },
            }
          }
        }
      }
    }
    if (best) {
      emit(run, best.spec)
      continue
    }
    for (const k of TURN_ORDER) {
      const rotated = rotate(run.cube, k)
      const slot = EDGE('FR')
      if (slotSolved(rotated, slot)) continue
      emit(run, {
        stage: 'middleEdges',
        caseId: 'ejectMiddle',
        piece: pieceName(colours(rotated, slot)),
        y: k,
        algId: 'insertRight',
      })
      break
    }
  }
}

function solveLastCross(run: Run): void {
  const counter = { n: 0 }
  const upAt = (c: Cube, name: string) => c[EDGE(name).facelets[0]] === 'U'
  while (!stageDone(run.cube, 'lastCross')) {
    guard(counter)
    const oriented = U_EDGES.filter((s) => run.cube[s.facelets[0]] === 'U')
    if (oriented.length === 0) {
      emit(run, { stage: 'lastCross', caseId: 'dot', piece: null, algId: 'lastCross' })
      continue
    }
    const opposite = oriented.some((s) => oriented.some((t) => isOpposite(s.name, t.name)))
    const holds = opposite ? ['UL', 'UR'] : ['UB', 'UL']
    const u = TURN_ORDER.find((t) => {
      const c = turnTop(run.cube, t)
      return holds.every((name) => upAt(c, name))
    })
    if (u === undefined) throw new Error('No hold for last cross')
    emit(run, {
      stage: 'lastCross',
      caseId: opposite ? 'line' : 'lShape',
      piece: null,
      u,
      algId: 'lastCross',
    })
  }
}

function isOpposite(a: string, b: string): boolean {
  return (a === 'UF' && b === 'UB') || (a === 'UB' && b === 'UF') || (a === 'UL' && b === 'UR') || (a === 'UR' && b === 'UL')
}

function solveLastEdges(run: Run): void {
  const counter = { n: 0 }
  const matched = (c: Cube) => U_EDGES.filter((s) => c[s.facelets[1]] === centre(c, s.faces[1]))
  while (true) {
    guard(counter)
    let u = 0
    let count = -1
    for (const t of TURN_ORDER) {
      const n = matched(turnTop(run.cube, t)).length
      if (n > count) {
        count = n
        u = t
      }
    }
    const aligned = turnTop(run.cube, u)
    if (count === 4) {
      if (u !== 0) emit(run, { stage: 'lastEdges', caseId: 'align', piece: null, u })
      return
    }
    const slots = matched(aligned)
    const adjacent = slots.length === 2 && !isOpposite(slots[0].name, slots[1].name)
    if (adjacent) {
      const k = TURN_ORDER.find((t) => {
        const names = matched(rotate(aligned, t)).map((s) => s.name)
        return names.includes('UB') && names.includes('UR')
      })
      if (k === undefined) throw new Error('No hold for adjacent edges')
      emit(run, { stage: 'lastEdges', caseId: 'adjacent', piece: null, y: k, u, algId: 'edgeSwap' })
    } else {
      emit(run, { stage: 'lastEdges', caseId: 'opposite', piece: null, u, algId: 'edgeSwap' })
    }
  }
}

function solveLastCornersPosition(run: Run): void {
  const counter = { n: 0 }
  while (!stageDone(run.cube, 'lastCornersPosition')) {
    guard(counter)
    const placed = U_CORNERS.filter((s) => cornerPlaced(run.cube, s))
    if (placed.length === 0) {
      emit(run, { stage: 'lastCornersPosition', caseId: 'nonePlaced', piece: null, algId: 'cornerCycle' })
      continue
    }
    if (placed.length !== 1) throw new Error('Unexpected corner arrangement')
    const k = TURN_ORDER.find((t) => cornerPlaced(rotate(run.cube, t), CORNER('UFR')))!
    const rotated = rotate(run.cube, k)
    const repeat = [1, 2].find((r) =>
      stageDone(applyMoves(rotated, repeated(ALGS.cornerCycle, r)), 'lastCornersPosition'),
    )
    if (repeat === undefined) throw new Error('Corner cycle did not place corners')
    emit(run, { stage: 'lastCornersPosition', caseId: 'onePlaced', piece: null, y: k, algId: 'cornerCycle', repeat })
  }
}

function solveLastCornersOrientation(run: Run): void {
  const counter = { n: 0 }
  const twisted = (c: Cube) => U_CORNERS.filter((s) => c[s.facelets[0]] !== 'U')
  while (twisted(run.cube).length > 0) {
    guard(counter)
    const u = TURN_ORDER.find((t) => {
      const c = turnTop(run.cube, t)
      return c[CORNER('UFR').facelets[0]] !== 'U'
    })!
    const prepared = turnTop(run.cube, u)
    const repeat = [2, 4].find((r) =>
      applyMoves(prepared, repeated(ALGS.cornerTwist, r))[CORNER('UFR').facelets[0]] === 'U',
    )
    if (repeat === undefined) throw new Error('Corner twist failed')
    emit(run, {
      stage: 'lastCornersOrientation',
      caseId: 'twist',
      piece: pieceName(colours(prepared, CORNER('UFR'))),
      u,
      algId: 'cornerTwist',
      repeat,
    })
  }
  if (!isSolved(run.cube)) {
    const u = TURN_ORDER.find((t) => isSolved(turnTop(run.cube, t)))
    if (u === undefined) throw new Error('Cube is not solved after orienting corners')
    emit(run, { stage: 'lastCornersOrientation', caseId: 'finalAlign', piece: null, u })
  }
}

const STAGE_SOLVERS: Record<StageId, (run: Run) => void> = {
  daisy: solveDaisy,
  cross: solveCross,
  firstLayerCorners: solveFirstLayerCorners,
  middleEdges: solveMiddleEdges,
  lastCross: solveLastCross,
  lastEdges: solveLastEdges,
  lastCornersPosition: solveLastCornersPosition,
  lastCornersOrientation: solveLastCornersOrientation,
}

export function solve(cube: Cube): Solution {
  const normalised = normalize(cube)
  if (!normalised || normalised.some((s, i) => s !== cube[i])) {
    throw new Error('Cube must be normalised: each centre must hold its own face colour')
  }
  if (validate(cube).length > 0) throw new Error('Cube is not solvable')

  const run: Run = { cube, steps: [] }
  for (const stage of STAGE_ORDER) {
    if (!stageDone(run.cube, stage)) STAGE_SOLVERS[stage](run)
  }
  return { steps: run.steps, moves: run.steps.flatMap((s) => [...s.setup, ...s.alg]) }
}
