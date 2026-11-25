import { describe, expect, it } from 'vitest'
import { SOLVED, applyMoves, mulberry32, randomScramble, type Cube } from './cube'
import { getModel } from './model'
import { validate } from './validate'
import {
  ALGS4,
  searchCentreCycle3,
  searchWingCycle3,
  getWingCycles,
  getRotations4,
  centresSolved,
  edgesPaired,
  getCentreCycles,
  reduce,
  relableMoves4,
  solve4,
  type Stage4,
  type Step4,
} from './solver4'

const m4 = getModel(4)
const STAGE_ORDER: Stage4[] = ['centres', 'edges', 'parity', 'daisy', 'cross', 'firstLayerCorners', 'middleEdges', 'lastCross', 'lastEdges', 'lastCornersPosition', 'lastCornersOrientation']
const STUCK = [
  'RURRDDULDDUFDRBRBUUUUBBFLUFFUUDBLFUDBFDRDBUDBBLLRRFFDRFFBRLRBLFDDBFFBLLLUBLLLRRUFULFLRDDRRFBLDBU',
  'BBUULBDRFRURLUUFLBDFDUBFLRLBFDRLFLFUFFFFDFBFRUUDUBBRLBLLLDDUBRBBDDLDBRLRDFDFLBUBRFLRRLURDURRDDUU',
  'BBRFUBLRLDRLFRRDLBBRDLFLFFURDUDLLFDFUBDLDULDRLDRBUFFBDBFLRURRLRULBFUFLURDDBBBBUDUUDDUFRUBRFLBFFU',
  'LFBBFFBURDLFDURFDUBLFUUDDDBLUDFUFBBLDLFLBRDRFBURULRBULDBRRUUDFLLDRDRLBUFBFLLBULRUDRBLRRUFBFRFDDR',
  'FLLDUDDULBLFDFFULRLFLRBRBFUBRRDUBURBBUFFLLRDDRLBRBDUFDLUFUFLLBBFRRULDDURDLRBFUDBLBFDDBFFDBRRRUUU',
  'FULBBRRDRDFRRDBBDBFDFFFLFBBLUUDUDFLRRURLDFULFUBRLRUBFLULFLBRUFBFDUDFBLDFRLDBBUUULDRLDBRLUUDBRDRL',
  'RFRFUUURDURBFUFBLRFLRRLLBUFRUUBBLRDDFLRFLFDDDFUFRUBRBFRBRDBRDLDLUFLULLLDLDBDRDLBDULBUDBUDBFFUBBF',
  'FLDBRUDRLLDFFRFDFUDUBBRFBLUFBFDRDULRUFRDLBFLFURDLRBLLDLLBBDLURRDUFDLBLRBBUBUBRUURFBRUFFUDURDBFDL',
  'BDRLUDDUBUURUURBLFRFDDULFBLLBDBLRRDDFRRBLFLUDFUURLLRBBFFRRFLFFDDUBRFLLBULUDUDBUBUDBLDLFDFRBBFFRR',
  'DLRDDDBLRBRDRLFFLRFLURDUDLUUDBBBUFDUUUFFUBDFFBBBDRLRFFRLDLLRRRLLFBFBLRURFUBLUBULBDURBFFDBLDRUDUF',
  'LBFRBFURULBRDBFFLFUDFULDLLRULBURFLDULDFLLUFDFUBUDFRBFLDUBFBRURRUDRLRBBUFURDURDRLBDLBLRRDBDBFFDDB',
  'UUFBBBLLFFRLFRDRDDURDUDFRRRULDRLUDBFLDFLFDBBBBBBUUDDFFRRFBUFFFUFBLDRRFUBRLDULRDLDURRLLLBBBUUULLD',
  'RFULDRLDUBFBDFBBLURDLUBFBBRFFBFLRLLDRLUULFDDUBDDLDLRBDDRFDULRUUFFRRBUFBBDLLDBULBFRRUDRULRRFFUFBU',
  'DDFLRFFBDDFUBBFLFLLFDBLLLUDLRRRRLURDFLBBBUDDUDUDBFFBLBRBDLFUBBUUFDLDURRLRLDULFFRURBRBURFUBUDFRRU',
]

function scrambled4(seed: number, length = 40): Cube {
  return m4.applyAll(m4.solved, m4.scramble(length, mulberry32(seed)))
}

function inverseMoves(moves: readonly string[]): string[] {
  return moves.map((move) => m4.invert(move)).reverse()
}

function replay(cube: Cube, steps: readonly Step4[]): Cube {
  return m4.applyAll(cube, steps.flatMap((step) => [...step.setup, ...step.alg, ...step.cleanup]))
}

describe('solver4 sanity', () => {
  it('reduces an embedded outer-turn 3x3 scramble', () => {
    for (let seed = 0; seed < 20; seed++) {
      const moves = randomScramble(18, mulberry32(seed))
      const cube3 = applyMoves(SOLVED, moves)
      const cube4 = m4.applyAll(m4.solved, moves)
      expect(reduce(cube4)).toEqual(cube3)
    }
  })

  it('ollParity gives exactly edgeFlip on the reduced cube', () => {
    const cube = m4.applyAll(m4.solved, ALGS4.ollParity)
    const reduced = reduce(cube)
    expect(reduced).not.toBeNull()
    expect(validate(reduced!)).toEqual([{ kind: 'edgeFlip' }])
  })

  it('pllParity gives exactly parity on the reduced cube', () => {
    const cube = m4.applyAll(m4.solved, ALGS4.pllParity)
    const reduced = reduce(cube)
    expect(reduced).not.toBeNull()
    expect(validate(reduced!)).toEqual([{ kind: 'parity' }])
  })

  it('relabels base algorithms like cube conjugation', () => {
    for (const rotation of getRotations4()) {
      for (const alg of Object.values(ALGS4)) {
        const relabelled = relableMoves4(alg, rotation.map)
        for (let seed = 0; seed < 20; seed++) {
          const state = scrambled4(seed + 1000)
          const expected = m4.applyAll(state, [...rotation.moves, ...alg, ...inverseMoves(rotation.moves)])
          expect(m4.applyAll(state, relabelled)).toEqual(expected)
        }
      }
    }
  }, 60000)
})

describe('solve4 smoke', () => {
  it('solves a few scrambles', () => {
    for (let seed = 0; seed < 5; seed++) {
      const cube = scrambled4(seed)
      const solution = solve4(cube)
      expect(m4.isSolved(replay(cube, solution.steps))).toBe(true)
      expect(solution.moves).toEqual(solution.steps.flatMap((step) => [...step.setup, ...step.alg, ...step.cleanup]))
    }
  }, 60000)

  it('handles edge cases', () => {
    expect(solve4(m4.solved)).toEqual({ steps: [], moves: [] })
    const rw = m4.apply(m4.solved, 'Rw')
    const rwSolution = solve4(rw)
    expect(m4.isSolved(replay(rw, rwSolution.steps))).toBe(true)

    const ollCube = m4.applyAll(m4.solved, ALGS4.ollParity)
    const ollSolution = solve4(ollCube)
    expect(ollSolution.steps.some((step) => step.stage === 'parity' && step.caseId === 'oll')).toBe(true)
    expect(m4.isSolved(replay(ollCube, ollSolution.steps))).toBe(true)

    const pllCube = m4.applyAll(m4.solved, ALGS4.pllParity)
    const pllSolution = solve4(pllCube)
    expect(pllSolution.steps.some((step) => step.stage === 'parity' && step.caseId === 'pll')).toBe(true)
    expect(m4.isSolved(replay(pllCube, pllSolution.steps))).toBe(true)

    expect(() => solve4([...m4.solved].slice(0, 95) as Cube)).toThrow()
  }, 60000)
})

describe('solve4 stuck cubes', () => {
  it('solves the previously non-converging centre transpositions', () => {
    for (const text of STUCK) {
      const cube = text.split('') as Cube
      const solution = solve4(cube)
      expect(m4.isSolved(replay(cube, solution.steps))).toBe(true)
    }
  }, 120000)
})

describe('solve4 random states', () => {
  it('solves 30 states built from all 63 moves', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = mulberry32(seed + 5000)
      const moves: string[] = []
      for (let i = 0; i < 40; i++) moves.push(m4.moves[Math.floor(rng() * m4.moves.length)])
      const cube = m4.applyAll(m4.solved, moves)
      const solution = solve4(cube)
      expect(m4.isSolved(replay(cube, solution.steps))).toBe(true)
    }
  }, 300000)
})

const CENTRE_IDX: number[] = []
m4.stickers.forEach((st, i) => {
  if (st.cell.filter((v) => v === 0 || v === 3).length === 1) CENTRE_IDX.push(i)
})

function idPerm(moves: readonly string[]): number[] {
  const id = Array.from({ length: 96 }, (_, i) => i) as unknown as Cube
  return m4.applyAll(id, moves) as unknown as number[]
}

describe('centre cycle', () => {
  it('basic commutator is a pure 3-cycle', () => {
    const moves = ALGS4.centreCycle3
    expect(moves).toHaveLength(8)
    const perm = idPerm(moves)
    const moved = perm.map((v, i) => (v === i ? -1 : i)).filter((i) => i >= 0)
    expect(moved).toHaveLength(3)
    for (const i of moved) expect(CENTRE_IDX).toContain(i)
    const search = searchCentreCycle3()
    expect(search.info.total).toBe(5832)
    expect(search.info.qualified).toBeGreaterThan(0)
    expect(search.info.pure).toBeGreaterThan(0)
    expect(search.moves).toEqual(moves)
  })

  it('classic alg is a 3-cycle', () => {
    const perm = idPerm(m4.parse("2R U 2L' U' 2R' U 2L U'"))
    expect(perm.filter((v, i) => v !== i)).toHaveLength(3)
  })

  it('reaches every oriented 3-cycle and conjugation is exact', () => {
    const cycles = getCentreCycles()
    expect(cycles).toHaveLength(4048)
    const maxS = Math.max(...cycles.map((c) => c.seq.length))
    console.log('centre cycle conjugators', cycles.length, 'maxS', maxS)
    const rng = mulberry32(77)
    for (let k = 0; k < 300; k++) {
      const cycle = cycles[Math.floor(rng() * cycles.length)]
      const seq = cycle.seq
      const perm = idPerm([...seq, ...ALGS4.centreCycle3, ...inverseMoves(seq)])
      const [t1, t2, t3] = cycle.triple.map((t) => CENTRE_IDX[t])
      const expected = Array.from({ length: 96 }, (_, i) => i)
      expected[t2] = t1
      expected[t3] = t2
      expected[t1] = t3
      expect(perm).toEqual(expected)
    }
  })
})

const WING_IDX = new Set<number>()
m4.stickers.forEach((st, i) => {
  if (st.cell.filter((v) => v === 0 || v === 3).length === 2) WING_IDX.add(i)
})

describe('wing cycle', () => {
  it('basic commutator is a pure wing 3-cycle', () => {
    const moves = ALGS4.wingCycle3
    expect(moves).toHaveLength(8)
    const perm = idPerm(moves)
    const moved = perm.map((v, i) => (v === i ? -1 : i)).filter((i) => i >= 0)
    expect(moved).toHaveLength(6)
    for (const i of moved) expect(WING_IDX.has(i)).toBe(true)
    const search = searchWingCycle3()
    expect(search.info.qualified).toBeGreaterThan(0)
    expect(search.moves).toEqual(moves)
  })

  it('reaches every oriented wing 3-cycle and conjugation is exact', () => {
    const cycles = getWingCycles()
    expect(cycles).toHaveLength(4048)
    const rng = mulberry32(99)
    for (let k = 0; k < 300; k++) {
      const cycle = cycles[Math.floor(rng() * cycles.length)]
      const perm = idPerm([...cycle.seq, ...ALGS4.wingCycle3, ...inverseMoves(cycle.seq)])
      const moved = perm.map((v, i) => (v === i ? -1 : i)).filter((i) => i >= 0)
      expect(moved).toHaveLength(6)
      for (const i of moved) expect(WING_IDX.has(i)).toBe(true)
    }
  })
})

interface Metric {
  steps: number
  moves: number
}

describe('solve4 full', () => {
  it('solves 200 scrambles with stage invariants and stats', () => {
    const times: number[] = []
    const totalSteps: number[] = []
    const totalMoves: number[] = []
    const perStage = new Map<string, Metric[]>()
    const perCase = new Map<string, Metric>()
    const algUse = new Map<string, number>()
    let olls = 0
    let plls = 0
    let parityWithSetup = 0
    let cyclesSolves = 0
    const failures: string[] = []
    for (let seed = 0; seed < 200; seed++) {
      const cube = scrambled4(seed + 10000)
      const t0 = performance.now()
      let solution
      try {
        solution = solve4(cube)
      } catch (error) {
        failures.push(seed + ' ' + (error as Error).message + ' ' + cube.join(''))
        continue
      }
      times.push(performance.now() - t0)
      expect(m4.isSolved(replay(cube, solution.steps))).toBe(true)
      expect(solution.moves).toEqual(solution.steps.flatMap((step) => [...step.setup, ...step.alg, ...step.cleanup]))
      let lastRank = 0
      let state = cube
      const stageMetrics = new Map<string, Metric>()
      solution.steps.forEach((step, index) => {
        const rank = STAGE_ORDER.indexOf(step.stage)
        expect(rank).toBeGreaterThanOrEqual(lastRank)
        lastRank = rank
        const stepMoves = [...step.setup, ...step.alg, ...step.cleanup]
        expect(stepMoves.length).toBeGreaterThan(0)
        for (const move of stepMoves) m4.spec(move)
        if (step.stage === 'centres' || step.stage === 'edges' || step.stage === 'parity') {
          for (const move of stepMoves) expect(/^[xyz]/.test(move)).toBe(false)
        }
        if (step.stage === 'centres' || step.stage === 'edges') {
          expect(step.focus.length).toBeGreaterThan(0)
          for (const f of step.focus) {
            expect(f).toBeGreaterThanOrEqual(0)
            expect(f).toBeLessThan(96)
          }
          if (step.caseId !== 'centreCycle' && step.caseId !== 'edgeCycle') for (const move of step.setup) expect(/^2/.test(move)).toBe(false)
        }
        if (step.stage === 'centres' || step.stage === 'edges' || step.stage === 'parity') {
          if (step.stage === 'parity' && step.setup.length > 0) parityWithSetup++
          if (step.caseId === 'oll') olls++
          if (step.caseId === 'pll') plls++
        }
        const key = step.stage + ':' + step.caseId
        const entry = perCase.get(key) ?? { steps: 0, moves: 0 }
        entry.steps++
        entry.moves += stepMoves.length
        perCase.set(key, entry)
        const se = stageMetrics.get(step.stage) ?? { steps: 0, moves: 0 }
        se.steps++
        se.moves += stepMoves.length
        stageMetrics.set(step.stage, se)
        const alg = step.algId ?? 'none'
        algUse.set(alg, (algUse.get(alg) ?? 0) + 1)
        state = m4.applyAll(state, stepMoves)
        const next = solution.steps[index + 1]
        if (step.stage === 'centres' && (!next || next.stage !== 'centres')) expect(centresSolved(state)).toBe(true)
        if (step.stage === 'edges' && (!next || next.stage !== 'edges')) {
          expect(edgesPaired(state) && centresSolved(state)).toBe(true)
        }
        if (step.stage === 'parity' && (!next || next.stage !== 'parity')) {
          expect(validate(reduce(state)!)).toEqual([])
        }
      })
      if (solution.steps.some((step) => step.caseId === 'centreCycle')) cyclesSolves++
      for (const [stage, metric] of stageMetrics) {
        const list = perStage.get(stage) ?? []
        list.push(metric)
        perStage.set(stage, list)
      }
      totalSteps.push(solution.steps.length)
      totalMoves.push(solution.moves.length)
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
    const sorted = [...times].sort((a, b) => a - b)
    const report: Record<string, unknown> = {
      failures,
      solved: times.length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      maxMs: sorted[sorted.length - 1],
      steps: { avg: avg(totalSteps), max: Math.max(...totalSteps) },
      moves: { avg: avg(totalMoves), max: Math.max(...totalMoves) },
      olls,
      plls,
      parityWithSetup,
      cyclesSolves,
      algUse: Object.fromEntries(algUse),
      stage: Object.fromEntries(
        [...perStage].map(([stage, list]) => [
          stage,
          { stepsAvg: avg(list.map((m) => m.steps)), stepsMax: Math.max(...list.map((m) => m.steps)), movesAvg: avg(list.map((m) => m.moves)), movesMax: Math.max(...list.map((m) => m.moves)) },
        ]),
      ),
      wing: { info: { ...searchWingCycle3().info }, dist: getWingCycles().reduce((h: Record<number, number>, c) => ((h[c.seq.length] = (h[c.seq.length] ?? 0) + 1), h), {}) },
      centreDist: getCentreCycles().reduce((h: Record<number, number>, c) => ((h[c.seq.length] = (h[c.seq.length] ?? 0) + 1), h), {}),
      cases: Object.fromEntries([...perCase].map(([k, v]) => [k, v])),
    }
    console.log('STATS ' + JSON.stringify(report))
    expect(failures).toEqual([])
    expect(Math.max(...totalSteps)).toBeLessThanOrEqual(50)
    expect(Math.max(...totalMoves)).toBeLessThanOrEqual(400)
    expect(sorted[Math.floor(sorted.length / 2)]).toBeLessThanOrEqual(1500)
  }, 900000)
})
