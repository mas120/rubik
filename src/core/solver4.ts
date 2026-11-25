import { FACES, FACE_NORMALS, type Cube, type Face } from './cube'
import { getModel } from './model'
import { solve, type StageId, type Step } from './solver'
import { validate } from './validate'

export const ALGS4: Record<string, string[]> = {
  centreA: ["Dw'", "Rw'", 'Dw'],
  centreA2: ["Dw'", 'Rw', 'Dw'],
  centreB: ['Rw', 'U', "Rw'"],
  centreB2: ['Rw', "U'", "Rw'"],
  centreC: ['Rw', 'U2', "Rw'"],
  pairA: ['Uw', "L'", "U'", 'L', "Uw'"],
  pairB: ["Uw'", 'R', 'U', "R'", 'Uw'],
  pairC: ['R', "U'", "B'", 'R2'],
  pairLast: ['Dw', 'R', "F'", 'U', "R'", 'F', "Dw'"],
  pairFlip: ['R', 'U', "R'", 'F', "R'", "F'", 'R'],
  ollParity: ['2R2', 'B2', 'U2', '2L', 'U2', "2R'", 'U2', '2R', 'U2', 'F2', '2R', 'F2', "2L'", 'B2', '2R2'],
  pllParity: ['2R2', 'U2', '2R2', 'Uw2', '2R2', 'Uw2'],
}

export type Stage4 = 'centres' | 'edges' | 'parity' | StageId

export interface Step4 {
  stage: Stage4
  caseId: string
  target: Face | null
  piece: string | null
  focus: number[]
  setup: string[]
  algId: string | null
  repeat: number
  alg: string[]
  cleanup: string[]
}

export interface Solution4 {
  steps: Step4[]
  moves: string[]
}

const model = getModel(4)
const FACE_INDEX: Record<Face, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }
const STICKERS = model.stickers

function faceCode(face: Face): number {
  return FACE_INDEX[face]
}

function toNums(cube: Cube): number[] {
  return cube.map((ch) => FACE_INDEX[ch])
}

function toCube3(nums: readonly number[]): Cube {
  return nums.map((code) => FACES[code])
}

function isExtreme(value: number): boolean {
  return value === 0 || value === 3
}

function extremeCount(cell: readonly number[]): number {
  return cell.reduce((count, value) => count + (isExtreme(value) ? 1 : 0), 0)
}

const indexByCellNormal = new Map<string, number>()
STICKERS.forEach((s, i) => {
  indexByCellNormal.set(`${s.cell.join(',')}|${s.normal.join(',')}`, i)
})

const centreGlobal: number[] = []
const centreCompact = new Int16Array(96).fill(-1)
const edgeGlobal: number[] = []
const edgeCompact = new Int16Array(96).fill(-1)
STICKERS.forEach((s, i) => {
  const count = extremeCount(s.cell)
  if (count === 1) {
    centreCompact[i] = centreGlobal.length
    centreGlobal.push(i)
  } else if (count === 2) {
    edgeCompact[i] = edgeGlobal.length
    edgeGlobal.push(i)
  }
})

const centreFaceCode = centreGlobal.map((index) => faceCode(STICKERS[index].face))

interface FaceGeom {
  axis: number
  extreme: number
}

const FACE_GEOM: Record<Face, FaceGeom> = (() => {
  const result = {} as Record<Face, FaceGeom>
  for (const face of FACES) {
    const normal = FACE_NORMALS[face]
    const axis = normal[0] !== 0 ? 0 : normal[1] !== 0 ? 1 : 2
    result[face] = { axis, extreme: normal[axis] > 0 ? 3 : 0 }
  }
  return result
})()

interface EdgeSlot {
  allGlobal: number[]
  compactA: number[]
  compactB: number[]
  reduceGlobal: number[]
}

function stickerAt(cell: readonly number[], face: Face): number {
  const found = indexByCellNormal.get(`${cell.join(',')}|${FACE_NORMALS[face].join(',')}`)
  if (found === undefined) throw new Error('Missing sticker')
  return found
}

const edgeSlots: EdgeSlot[] = []
for (let i = 0; i < FACES.length; i++) {
  for (let j = i + 1; j < FACES.length; j++) {
    const a = FACES[i]
    const b = FACES[j]
    const na = FACE_NORMALS[a]
    const nb = FACE_NORMALS[b]
    if (na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] !== 0) continue
    const ga = FACE_GEOM[a]
    const gb = FACE_GEOM[b]
    const third = 3 - ga.axis - gb.axis
    const wings = [1, 2].map((along) => {
      const cell = [0, 0, 0]
      cell[ga.axis] = ga.extreme
      cell[gb.axis] = gb.extreme
      cell[third] = along
      return { a: stickerAt(cell, a), b: stickerAt(cell, b) }
    })
    wings.sort((x, y) => x.a - y.a)
    edgeSlots.push({
      allGlobal: [wings[0].a, wings[0].b, wings[1].a, wings[1].b],
      compactA: [edgeCompact[wings[0].a], edgeCompact[wings[1].a]],
      compactB: [edgeCompact[wings[0].b], edgeCompact[wings[1].b]],
      reduceGlobal: [wings[0].a, wings[0].b],
    })
  }
}

function collapseCoordinate(value: number): number {
  return value === 0 ? 0 : value === 3 ? 2 : 1
}

function to3Index(globalIndex: number): number {
  const s = STICKERS[globalIndex]
  return faceCode(s.face) * 9 + collapseCoordinate(s.row) * 3 + collapseCoordinate(s.col)
}

const reducePairs: [number, number][] = []
STICKERS.forEach((s, i) => {
  if (extremeCount(s.cell) === 3) reducePairs.push([i, to3Index(i)])
})
for (const face of FACES) {
  const found = STICKERS.findIndex((s) => s.face === face && s.row === 1 && s.col === 1)
  if (found < 0) throw new Error('Missing centre sticker')
  reducePairs.push([found, to3Index(found)])
}
for (const slot of edgeSlots) {
  for (const index of slot.reduceGlobal) reducePairs.push([index, to3Index(index)])
}

const ID_CUBE = Array.from({ length: 96 }, (_, i) => i) as unknown as Cube
const ID_PERM = Uint8Array.from({ length: 96 }, (_, i) => i)
const permCache = new Map<string, Uint8Array>()

function permOfMoves(moves: readonly string[]): Uint8Array {
  const key = moves.join(' ')
  const cached = permCache.get(key)
  if (cached) return cached
  const out = model.applyAll(ID_CUBE, moves) as unknown as number[]
  const perm = Uint8Array.from(out)
  permCache.set(key, perm)
  return perm
}

function composePerm(first: Uint8Array, second: Uint8Array): Uint8Array {
  const out = new Uint8Array(96)
  for (let i = 0; i < 96; i++) out[i] = first[second[i]]
  return out
}

function applyPerm(state: readonly number[], perm: Uint8Array): number[] {
  const out = new Array<number>(96)
  for (let i = 0; i < 96; i++) out[i] = state[perm[i]]
  return out
}

function splitMove(move: string): { core: string; suffix: string } {
  if (move.endsWith("'")) return { core: move.slice(0, -1), suffix: "'" }
  if (move.endsWith('2') && move.length > 1) return { core: move.slice(0, -1), suffix: '2' }
  return { core: move, suffix: '' }
}

function mapCoreFace(core: string, map: (face: Face) => Face): string {
  const chars = core.split('')
  for (let i = 0; i < chars.length; i++) {
    const face = chars[i] as Face
    if (face in FACE_INDEX) {
      chars[i] = map(face)
      break
    }
  }
  return chars.join('')
}

export function relableMoves4(moves: readonly string[], map: Readonly<Record<Face, Face>>): string[] {
  return moves.map((move) => {
    const { core, suffix } = splitMove(move)
    return `${mapCoreFace(core, (face) => map[face])}${suffix}`
  })
}

export function mirrorMoves4(moves: readonly string[]): string[] {
  return moves.map((move) => {
    const { core, suffix } = splitMove(move)
    const mirrored = mapCoreFace(core, (face) => (face === 'R' ? 'L' : face === 'L' ? 'R' : face))
    if (suffix === '2') return `${mirrored}2`
    return suffix === "'" ? mirrored : `${mirrored}'`
  })
}

export interface Rotation4 {
  moves: readonly string[]
  map: Readonly<Record<Face, Face>>
}

function buildRotations4(): Rotation4[] {
  const rotationMoves = model.moves.filter((move) => /^[xyz]/.test(move))
  const centreIndex = (face: Face) => FACE_INDEX[face] * 16 + 5
  const keyOf = (cube: Cube) => FACES.map((face) => cube[centreIndex(face)]).join('')
  const start: { moves: string[]; cube: Cube } = { moves: [], cube: model.solved }
  const queue = [start]
  const seen = new Set([keyOf(model.solved)])
  for (let head = 0; head < queue.length && seen.size < 24; head++) {
    const current = queue[head]
    for (const move of rotationMoves) {
      const cube = model.apply(current.cube, move)
      const key = keyOf(cube)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ moves: [...current.moves, move], cube })
    }
  }
  return queue.map(({ moves, cube }) => ({
    moves,
    map: Object.fromEntries(FACES.map((face) => [face, cube[centreIndex(face)]])) as Record<Face, Face>,
  }))
}

export const ROTATIONS4: readonly Rotation4[] = buildRotations4()

const CYCLE_MOVES: string[] = (() => {
  const outer = FACES.flatMap((face) => [face, `${face}'`, `${face}2`])
  const inner = FACES.flatMap((face) => [`2${face}`, `2${face}'`, `2${face}2`])
  return [...outer, ...inner]
})()

function centrePermOfSeq(moves: readonly string[]): Uint8Array | null {
  return centrePermOfFull(permOfMoves(moves))
}

function isCentre3Cycle(perm: Uint8Array): boolean {
  const moved: number[] = []
  for (let i = 0; i < 24; i++) if (perm[i] !== i) moved.push(i)
  if (moved.length !== 3) return false
  const a = moved[0]
  const b = perm[a]
  const c = perm[b]
  return perm[c] === a && moved.includes(b) && moved.includes(c)
}

export interface CentreCycleInfo {
  total: number
  qualified: number
  pure: number
  chosen: string[]
}

function findCentreCycle3(): { moves: string[]; info: CentreCycleInfo } {
  const inner = CYCLE_MOVES.filter((move) => move.startsWith('2'))
  const outer = CYCLE_MOVES.filter((move) => !move.startsWith('2'))
  const qualifiers: { moves: string[]; pure: boolean; halves: number; order: number }[] = []
  let order = 0
  let total = 0
  for (const a of inner) {
    for (const y of outer) {
      for (const z of inner) {
        total++
        const moves = [a, y, z, model.invert(y), model.invert(a), y, model.invert(z), model.invert(y)]
        const full = permOfMoves(moves)
        const perm = centrePermOfFull(full)
        order++
        if (!perm || !isCentre3Cycle(perm)) continue
        let changed = 0
        for (let i = 0; i < 96; i++) if (full[i] !== i) changed++
        qualifiers.push({
          moves,
          pure: changed === 3,
          halves: moves.filter((move) => move.endsWith('2')).length,
          order,
        })
      }
    }
  }
  if (!qualifiers.length) throw new Error('No centre 3-cycle commutator')
  qualifiers.sort((p, q) => Number(q.pure) - Number(p.pure) || p.halves - q.halves || p.order - q.order)
  return {
    moves: qualifiers[0].moves,
    info: {
      total,
      qualified: qualifiers.length,
      pure: qualifiers.filter((q) => q.pure).length,
      chosen: qualifiers[0].moves,
    },
  }
}

const CENTRE_CYCLE_SEARCH = findCentreCycle3()
export const CENTRE_CYCLE_INFO: CentreCycleInfo = CENTRE_CYCLE_SEARCH.info
ALGS4.centreCycle3 = CENTRE_CYCLE_SEARCH.moves

function canonTriple(triple: readonly [number, number, number]): [number, number, number] {
  const rots: [number, number, number][] = [
    [triple[0], triple[1], triple[2]],
    [triple[1], triple[2], triple[0]],
    [triple[2], triple[0], triple[1]],
  ]
  rots.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  return rots[0]
}

export interface CentreCycle {
  triple: [number, number, number]
  seq: string[]
}

let centreCycles: CentreCycle[] | null = null

export function getCentreCycles(): CentreCycle[] {
  if (centreCycles) return centreCycles
  const cpC = centrePermOfSeq(ALGS4.centreCycle3)
  if (!cpC) throw new Error('centreCycle3 is not centre-preserving')
  const invC = new Uint8Array(24)
  for (let i = 0; i < 24; i++) invC[cpC[i]] = i
  const moved: number[] = []
  for (let i = 0; i < 24; i++) if (invC[i] !== i) moved.push(i)
  if (moved.length !== 3) throw new Error('centreCycle3 is not a 3-cycle')
  const start = canonTriple([moved[0], invC[moved[0]], invC[invC[moved[0]]]] as [number, number, number])
  const movePerms = CYCLE_MOVES.map((move) => ({ move, perm: centrePermOfSeq([move])! }))
  const seen = new Set<string>([start.join(',')])
  const queue: [CentreCycle['triple'], string[]][] = [[start, []]]
  const out: CentreCycle[] = []
  for (let head = 0; head < queue.length; head++) {
    const [triple, seq] = queue[head]
    out.push({ triple, seq })
    for (const { move, perm } of movePerms) {
      const next = canonTriple([perm[triple[0]], perm[triple[1]], perm[triple[2]]] as [number, number, number])
      const key = next.join(',')
      if (seen.has(key)) continue
      seen.add(key)
      const nextSeq = [move, ...seq]
      queue.push([next, nextSeq])
    }
  }
  centreCycles = out
  return out
}

function pickCentreCycle(
  cols: readonly number[],
  beforeMeasure: number,
  beforeFull: readonly boolean[],
  faceSet: ReadonlySet<number>,
): { seq: string[]; perm: Uint8Array } | null {
  let best: { seq: string[]; perm: Uint8Array } | null = null
  let bestGain = 0
  let bestCost = Infinity
  let bestOrder = Infinity
  const cycles = getCentreCycles()
  for (let index = 0; index < cycles.length; index++) {
    const { triple, seq } = cycles[index]
    const perm = new Uint8Array(24)
    for (let i = 0; i < 24; i++) perm[i] = i
    perm[triple[1]] = triple[0]
    perm[triple[2]] = triple[1]
    perm[triple[0]] = triple[2]
    const { measure, counts } = evalCentreCols(applyCompact(cols, perm), faceSet)
    const gain = measure - beforeMeasure
    if (gain < 1) continue
    let ok = true
    for (let face = 0; face < 6; face++) {
      if (beforeFull[face] && counts[face] !== 4) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const cost = 2 * seq.length + ALGS4.centreCycle3.length
    if (gain > bestGain || (gain === bestGain && (cost < bestCost || (cost === bestCost && index < bestOrder)))) {
      best = { seq, perm }
      bestGain = gain
      bestCost = cost
      bestOrder = index
    }
  }
  return best
}

export interface WingCycleInfo {
  total: number
  qualified: number
  family: string
  chosen: string[]
}

function wingCycleStructure(perm: Uint8Array): { moved: number[] } | null {
  const moved: number[] = []
  for (let i = 0; i < 96; i++) if (perm[i] !== i) moved.push(i)
  if (moved.length !== 6) return null
  for (const i of moved) if (edgeCompact[i] < 0) return null
  const seen = new Set<number>()
  for (const start of moved) {
    if (seen.has(start)) continue
    let length = 0
    let cur = start
    while (!seen.has(cur)) {
      seen.add(cur)
      cur = perm[cur]
      length++
    }
    if (length !== 3) return null
  }
  return { moved }
}

function findWingCycle3(): { moves: string[]; info: WingCycleInfo } {
  const inner = CYCLE_MOVES.filter((move) => move.startsWith('2'))
  const outer = CYCLE_MOVES.filter((move) => !move.startsWith('2'))
  const families: { name: string; a: string[]; y: string[]; z: string[] }[] = [
    { name: 'inner/outer/outer', a: inner, y: outer, z: outer },
    { name: 'outer/inner/outer', a: outer, y: inner, z: outer },
    { name: 'outer/outer/inner', a: outer, y: outer, z: inner },
  ]
  const letter = (move: string) => move.replace(/^2/, '')[0]
  for (const family of families) {
    const qualifiers: { moves: string[]; halves: number; order: number }[] = []
    let total = 0
    let order = 0
    for (const a of family.a) {
      for (const y of family.y) {
        for (const z of family.z) {
          if (letter(y) === letter(z)) continue
          total++
          order++
          const moves = [a, y, z, model.invert(y), model.invert(a), y, model.invert(z), model.invert(y)]
          if (!wingCycleStructure(permOfMoves(moves))) continue
          qualifiers.push({ moves, halves: moves.filter((move) => move.endsWith('2')).length, order })
        }
      }
    }
    if (!qualifiers.length) continue
    qualifiers.sort((p, q) => p.halves - q.halves || p.order - q.order)
    return {
      moves: qualifiers[0].moves,
      info: { total, qualified: qualifiers.length, family: family.name, chosen: qualifiers[0].moves },
    }
  }
  throw new Error('No wing 3-cycle commutator')
}

const WING_CYCLE_SEARCH = findWingCycle3()
export const WING_CYCLE_INFO: WingCycleInfo = WING_CYCLE_SEARCH.info
ALGS4.wingCycle3 = WING_CYCLE_SEARCH.moves

export interface WingCycle {
  moved: number[]
  source: number[]
  seq: string[]
}

let wingCycles: WingCycle[] | null = null

function wingCycleKey(moved: readonly number[], source: readonly number[]): string {
  return moved
    .map((t, i) => [t, source[i]] as const)
    .sort((p, q) => p[0] - q[0])
    .map(([t, s]) => `${t}:${s}`)
    .join(',')
}

export function getWingCycles(): WingCycle[] {
  if (wingCycles) return wingCycles
  const base = permOfMoves(ALGS4.wingCycle3)
  const baseMoved: number[] = []
  for (let i = 0; i < 96; i++) if (base[i] !== i) baseMoved.push(edgeCompact[i])
  const baseSource = baseMoved.map((t) => edgeCompact[base[edgeGlobal[t]]])
  const movePerms = CYCLE_MOVES.map((move) => ({ move, perm: permOfMoves([move]) }))
  const seen = new Set<string>([wingCycleKey(baseMoved, baseSource)])
  const queue: WingCycle[] = [{ moved: baseMoved, source: baseSource, seq: [] }]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    for (const { move, perm } of movePerms) {
      const moved = current.moved.map((t) => edgeCompact[perm[edgeGlobal[t]]])
      const source = current.source.map((s) => edgeCompact[perm[edgeGlobal[s]]])
      const key = wingCycleKey(moved, source)
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ moved, source, seq: [move, ...current.seq] })
    }
  }
  wingCycles = queue
  return queue
}

function pickWingCycle(cols: readonly number[]): { seq: string[] } | null {
  const before = pairMaskFromCols(cols)
  const beforeCount = pairCount(before)
  const cost0 = ALGS4.wingCycle3.length
  let best: WingCycle | null = null
  let bestGain = 0
  let bestCost = Infinity
  const next = [...cols]
  for (const cycle of getWingCycles()) {
    for (let i = 0; i < cycle.moved.length; i++) next[cycle.moved[i]] = cols[cycle.source[i]]
    const after = pairMaskFromCols(next)
    for (const t of cycle.moved) next[t] = cols[t]
    if (before & ~after) continue
    const gain = pairCount(after) - beforeCount
    if (gain < 1) continue
    const cost = 2 * cycle.seq.length + cost0
    if (gain > bestGain || (gain === bestGain && cost < bestCost)) {
      best = cycle
      bestGain = gain
      bestCost = cost
    }
  }
  return best ? { seq: best.seq } : null
}

interface Candidate {
  algId: string
  order: number
  moves: string[]
  perm: Uint8Array
}

function permKey(perm: Uint8Array): string {
  return perm.join(',')
}

function buildCandidates(names: readonly string[]): Candidate[] {
  const seen = new Set<string>()
  const candidates: Candidate[] = []
  for (const name of names) {
    const variants = [ALGS4[name], mirrorMoves4(ALGS4[name])]
    for (const variant of variants) {
      for (const rotation of ROTATIONS4) {
        const moves = relableMoves4(variant, rotation.map)
        const perm = permOfMoves(moves)
        const key = permKey(perm)
        if (seen.has(key)) continue
        seen.add(key)
        candidates.push({ algId: name, order: candidates.length, moves, perm })
      }
    }
  }
  return candidates
}

const CENTRE_ALG_NAMES = ['centreA', 'centreA2', 'centreB', 'centreB2', 'centreC']
const EDGE_ALG_NAMES = ['pairA', 'pairB', 'pairC', 'pairLast', 'pairFlip']

let centreCandidates: Candidate[] | null = null
let edgeCandidates: Candidate[] | null = null

function getCentreCandidates(): Candidate[] {
  if (!centreCandidates) centreCandidates = buildCandidates(CENTRE_ALG_NAMES)
  return centreCandidates
}

function getEdgeCandidates(): Candidate[] {
  if (!edgeCandidates) edgeCandidates = buildCandidates(EDGE_ALG_NAMES)
  return edgeCandidates
}

function invertMoves4(moves: readonly string[]): string[] {
  return moves.map((move) => model.invert(move)).reverse()
}

interface Setup {
  moves: string[]
  perm: Uint8Array
  cleanup: string[]
  cleanupPerm: Uint8Array
}

const OUTER_MOVES = FACES.flatMap((face) => [face, `${face}'`, `${face}2`])

const SETUPS: Setup[] = (() => {
  const setups: { moves: string[] }[] = [{ moves: [] }]
  for (const first of OUTER_MOVES) setups.push({ moves: [first] })
  for (const first of OUTER_MOVES) {
    for (const second of OUTER_MOVES) {
      if (second[0] === first[0]) continue
      setups.push({ moves: [first, second] })
    }
  }
  return setups.map(({ moves }) => {
    const cleanup = invertMoves4(moves)
    return { moves, perm: permOfMoves(moves), cleanup, cleanupPerm: permOfMoves(cleanup) }
  })
})()

interface Macro {
  perm: Uint8Array
  alg: string[]
  setup: string[]
  cleanup: string[]
  algId: string
  totalMoves: number
  candidateOrder: number
  genOrder: number
}

interface CentreMacro extends Macro {
  centrePerm: Uint8Array
}

interface EdgeMacro extends Macro {
  edgePerm: Uint8Array
  preservesCentres: boolean
}

function tieCompare(a: Macro, b: Macro): number {
  return (
    a.totalMoves - b.totalMoves ||
    a.setup.length - b.setup.length ||
    a.candidateOrder - b.candidateOrder ||
    a.genOrder - b.genOrder
  )
}

function dedupeMacros<T extends Macro>(macros: T[], keyOf: (macro: T) => string): T[] {
  const best = new Map<string, T>()
  for (const macro of macros) {
    const key = keyOf(macro)
    const current = best.get(key)
    if (!current || tieCompare(macro, current) < 0) best.set(key, macro)
  }
  return [...best.values()]
}

function buildCentreMacros(candidates: Candidate[]): CentreMacro[] {
  const macros: CentreMacro[] = []
  let genOrder = 0
  for (const candidate of candidates) {
    for (const setup of SETUPS) {
      const modes = setup.moves.length === 0 ? [false] : [true, false]
      for (const useCleanup of modes) {
        const cleanup = useCleanup ? setup.cleanup : []
        const cleanupPerm = useCleanup ? setup.cleanupPerm : ID_PERM
        const perm = composePerm(composePerm(setup.perm, candidate.perm), cleanupPerm)
        const centrePerm = new Uint8Array(24)
        let valid = true
        for (let t = 0; t < 24; t++) {
          const source = perm[centreGlobal[t]]
          const compact = centreCompact[source]
          if (compact < 0) {
            valid = false
            break
          }
          centrePerm[t] = compact
        }
        if (!valid) continue
        macros.push({
          perm,
          alg: candidate.moves,
          setup: setup.moves,
          cleanup,
          algId: candidate.algId,
          totalMoves: setup.moves.length + candidate.moves.length + cleanup.length,
          candidateOrder: candidate.order,
          genOrder: genOrder++,
          centrePerm,
        })
      }
    }
  }
  return dedupeMacros(macros, (macro) => macro.centrePerm.join(','))
}

function buildEdgeMacros(candidates: Candidate[]): EdgeMacro[] {
  const macros: EdgeMacro[] = []
  let genOrder = 0
  for (const candidate of candidates) {
    for (const setup of SETUPS) {
      const modes = setup.moves.length === 0 ? [false] : [true, false]
      for (const useCleanup of modes) {
        const cleanup = useCleanup ? setup.cleanup : []
        const cleanupPerm = useCleanup ? setup.cleanupPerm : ID_PERM
        const perm = composePerm(composePerm(setup.perm, candidate.perm), cleanupPerm)
        const centrePerm = new Uint8Array(24)
        const edgePerm = new Uint8Array(48)
        let valid = true
        let preservesCentres = true
        for (let t = 0; t < 24; t++) {
          const source = perm[centreGlobal[t]]
          const compact = centreCompact[source]
          if (compact < 0) {
            valid = false
            break
          }
          centrePerm[t] = compact
          if (centreFaceCode[compact] !== centreFaceCode[t]) preservesCentres = false
        }
        if (!valid || !preservesCentres) continue
        for (let e = 0; e < 48; e++) {
          const source = perm[edgeGlobal[e]]
          const compact = edgeCompact[source]
          if (compact < 0) {
            valid = false
            break
          }
          edgePerm[e] = compact
        }
        if (!valid) continue
        macros.push({
          perm,
          alg: candidate.moves,
          setup: setup.moves,
          cleanup,
          algId: candidate.algId,
          totalMoves: setup.moves.length + candidate.moves.length + cleanup.length,
          candidateOrder: candidate.order,
          genOrder: genOrder++,
          edgePerm,
          preservesCentres,
        })
      }
    }
  }
  return dedupeMacros(macros, (macro) => macro.edgePerm.join(','))
}

let centreMacros: { sorted: CentreMacro[]; byGen: CentreMacro[] } | null = null
let edgeMacros: { sorted: EdgeMacro[]; byGen: EdgeMacro[] } | null = null

function getCentreMacros() {
  if (!centreMacros) {
    const macros = buildCentreMacros(getCentreCandidates())
    centreMacros = {
      sorted: [...macros].sort(tieCompare),
      byGen: [...macros].sort((a, b) => a.genOrder - b.genOrder),
    }
  }
  return centreMacros
}

function getEdgeMacros() {
  if (!edgeMacros) {
    const macros = buildEdgeMacros(getEdgeCandidates())
    edgeMacros = {
      sorted: [...macros].sort(tieCompare),
      byGen: [...macros].sort((a, b) => a.genOrder - b.genOrder),
    }
  }
  return edgeMacros
}

function applyCompact(src: readonly number[], perm: Uint8Array): number[] {
  const out = new Array<number>(perm.length)
  for (let i = 0; i < perm.length; i++) out[i] = src[perm[i]]
  return out
}

function centrePermOfFull(perm: Uint8Array): Uint8Array | null {
  const out = new Uint8Array(24)
  for (let t = 0; t < 24; t++) {
    const compact = centreCompact[perm[centreGlobal[t]]]
    if (compact < 0) return null
    out[t] = compact
  }
  return out
}

function evalCentreCols(cols: readonly number[], faceSet: ReadonlySet<number>): { measure: number; counts: number[] } {
  const counts = [0, 0, 0, 0, 0, 0]
  let measure = 0
  for (let t = 0; t < 24; t++) {
    const colour = cols[t]
    const target = centreFaceCode[t]
    if (colour === target) {
      counts[target]++
      if (faceSet.has(target)) measure++
    }
  }
  return { measure, counts }
}

function centreStats(state: readonly number[]): { cols: number[]; counts: number[] } {
  const cols = new Array<number>(24)
  const counts = [0, 0, 0, 0, 0, 0]
  for (let t = 0; t < 24; t++) {
    cols[t] = state[centreGlobal[t]]
    if (cols[t] === centreFaceCode[t]) counts[centreFaceCode[t]]++
  }
  return { cols, counts }
}

function edgeCols(state: readonly number[]): number[] {
  return edgeGlobal.map((index) => state[index])
}

function pairMaskFromCols(cols: readonly number[]): number {
  let mask = 0
  edgeSlots.forEach((slot, index) => {
    const [a0, a1] = slot.compactA
    const [b0, b1] = slot.compactB
    if (cols[a0] === cols[a1] && cols[b0] === cols[b1]) mask |= 1 << index
  })
  return mask
}

function pairCount(mask: number): number {
  let count = 0
  for (let i = 0; i < 12; i++) if (mask & (1 << i)) count++
  return count
}

function centresSolvedNum(state: readonly number[]): boolean {
  for (let t = 0; t < 24; t++) if (state[centreGlobal[t]] !== centreFaceCode[t]) return false
  return true
}

function edgesPairedNum(state: readonly number[]): boolean {
  return pairCount(pairMaskFromCols(edgeCols(state))) === 12
}

function reduceState(state: readonly number[]): number[] | null {
  if (!centresSolvedNum(state) || !edgesPairedNum(state)) return null
  const out = new Array<number>(54).fill(-1)
  for (const [from4, to3] of reducePairs) out[to3] = state[from4]
  return out.every((value) => value >= 0) ? out : null
}

export function centresSolved(cube: Cube): boolean {
  return centresSolvedNum(toNums(cube))
}

export function edgesPaired(cube: Cube): boolean {
  return edgesPairedNum(toNums(cube))
}

export function reduce(cube: Cube): Cube | null {
  const reduced = reduceState(toNums(cube))
  return reduced ? toCube3(reduced) : null
}

interface Run4 {
  state: number[]
  steps: Step4[]
}

function pushStep4(run: Run4, step: Step4, perm: Uint8Array): void {
  run.steps.push(step)
  run.state = applyPerm(run.state, perm)
}

function centreFocus(state: readonly number[], after: readonly number[], macro: { perm: Uint8Array }): { focus: number[]; target: Face | null } {
  const seen = new Set<number>()
  const counts = [0, 0, 0, 0, 0, 0]
  for (let t = 0; t < 24; t++) {
    const index = centreGlobal[t]
    const target = centreFaceCode[t]
    if (state[index] === target || after[index] !== target) continue
    seen.add(index)
    seen.add(macro.perm[index])
    counts[target]++
  }
  let best = 0
  for (let i = 1; i < 6; i++) if (counts[i] > counts[best]) best = i
  let targetFace: Face | null = null
  if (counts[best] > 0) targetFace = FACES[best]
  return { focus: [...seen], target: targetFace }
}

function edgeFocus(state: readonly number[], after: readonly number[], macro: { perm: Uint8Array }): number[] {
  const before = pairMaskFromCols(edgeCols(state))
  const afterMask = pairMaskFromCols(edgeCols(after))
  const seen = new Set<number>()
  for (let slot = 0; slot < 12; slot++) {
    if (!(afterMask & (1 << slot)) || before & (1 << slot)) continue
    for (const index of edgeSlots[slot].allGlobal) {
      seen.add(index)
      seen.add(macro.perm[index])
    }
  }
  return [...seen]
}

function guard(counter: { n: number }, detail: () => string): void {
  if (++counter.n > 200) throw new Error(`Solver did not converge (step cap) ${detail()}`)
}

function solveCentres4(run: Run4): void {
  if (centresSolvedNum(run.state)) return
  const counter = { n: 0 }
  const phases = [
    { caseId: 'centreD', faces: [3] },
    { caseId: 'centreU', faces: [3, 0] },
    { caseId: 'centreSides', faces: [0, 1, 2, 3, 4, 5] },
  ]
  for (const phase of phases) {
    const wanted = phase.faces.length * 4
    while (true) {
      guard(counter, () => `centres ${phase.caseId} state=${run.state.join('')}`)
      const { cols, counts } = centreStats(run.state)
      const beforeMeasure = phase.faces.reduce((sum, face) => sum + counts[face], 0)
      if (beforeMeasure === wanted) break
      const beforeFull = counts.map((count) => count === 4)
      const faceSet = new Set(phase.faces)
      let best: CentreMacro | null = null
      let bestDelta = 0
      for (const macro of getCentreMacros().sorted) {
        const afterCounts = [0, 0, 0, 0, 0, 0]
        let measure = 0
        let valid = true
        for (let t = 0; t < 24; t++) {
          const source = macro.centrePerm[t]
          const target = centreFaceCode[t]
          const colour = cols[source]
          if (colour === target) {
            afterCounts[target]++
            if (faceSet.has(target)) measure++
          }
        }
        const delta = measure - beforeMeasure
        if (delta < 1) continue
        for (let face = 0; face < 6; face++) {
          if (beforeFull[face] && afterCounts[face] < 4) {
            valid = false
            break
          }
        }
        if (!valid) continue
        if (!best || delta > bestDelta) {
          best = macro
          bestDelta = delta
        }
      }
      if (best) {
        const after = applyPerm(run.state, best.perm)
        const { focus, target } = centreFocus(run.state, after, best)
        pushStep4(
          run,
          {
            stage: 'centres',
            caseId: phase.caseId,
            target,
            piece: null,
            focus,
            setup: best.setup,
            algId: best.algId,
            repeat: 1,
            alg: best.alg,
            cleanup: best.cleanup,
          },
          best.perm,
        )
        continue
      }
      const cycle = pickCentreCycle(cols, beforeMeasure, beforeFull, faceSet)
      if (cycle) {
        const fullMoves = [...cycle.seq, ...ALGS4.centreCycle3, ...invertMoves4(cycle.seq)]
        const perm = permOfMoves(fullMoves)
        const after = applyPerm(run.state, perm)
        const { focus, target } = centreFocus(run.state, after, { perm })
        pushStep4(
          run,
          {
            stage: 'centres',
            caseId: 'centreCycle',
            target,
            piece: null,
            focus,
            setup: cycle.seq,
            algId: 'centreCycle3',
            repeat: 1,
            alg: ALGS4.centreCycle3,
            cleanup: invertMoves4(cycle.seq),
          },
          perm,
        )
        continue
      }
      throw new Error(`Solver did not converge centres ${phase.caseId} ${beforeMeasure}/${wanted} counts=${counts.join(',')} cols=${cols.join('')}`)
    }
  }
}

function solveEdges4(run: Run4): void {
  const counter = { n: 0 }
  while (!edgesPairedNum(run.state)) {
    guard(counter, () => `edges pairs=${pairCount(pairMaskFromCols(edgeCols(run.state)))} state=${run.state.join('')}`)
    const cols = edgeCols(run.state)
    const beforeCount = pairCount(pairMaskFromCols(cols))
    let best: EdgeMacro | null = null
    let bestDelta = 0
    for (const macro of getEdgeMacros().sorted) {
      const next = new Array<number>(48)
      for (let e = 0; e < 48; e++) next[e] = cols[macro.edgePerm[e]]
      const delta = pairCount(pairMaskFromCols(next)) - beforeCount
      if (delta < 1) continue
      if (!best || delta > bestDelta) {
        best = macro
        bestDelta = delta
      }
    }
    if (best) {
      const after = applyPerm(run.state, best.perm)
      const focus = edgeFocus(run.state, after, best)
      pushStep4(
        run,
        {
          stage: 'edges',
          caseId: best.algId,
          target: null,
          piece: null,
          focus,
          setup: best.setup,
          algId: best.algId,
          repeat: 1,
          alg: best.alg,
          cleanup: best.cleanup,
        },
        best.perm,
      )
      continue
    }
    const cycle = pickWingCycle(cols)
    if (!cycle) throw new Error(`Solver did not converge edges pairs=${beforeCount} state=${run.state.join('')}`)
    const cleanup = invertMoves4(cycle.seq)
    const perm = permOfMoves([...cycle.seq, ...ALGS4.wingCycle3, ...cleanup])
    const after = applyPerm(run.state, perm)
    pushStep4(
      run,
      {
        stage: 'edges',
        caseId: 'edgeCycle',
        target: null,
        piece: null,
        focus: edgeFocus(run.state, after, { perm }),
        setup: cycle.seq,
        algId: 'wingCycle3',
        repeat: 1,
        alg: ALGS4.wingCycle3,
        cleanup,
      },
      perm,
    )
  }
}

interface ParityChoice {
  setup: string[]
  cleanup: string[]
  perm: Uint8Array
}

function findParityMacro(state: readonly number[], algName: 'ollParity' | 'pllParity', kind: 'edgeFlip' | 'parity'): ParityChoice {
  const alg = ALGS4[algName]
  const algPerm = permOfMoves(alg)
  for (const setup of SETUPS) {
    const modes = setup.moves.length === 0 ? [false] : [true, false]
    for (const useCleanup of modes) {
      const cleanup = useCleanup ? setup.cleanup : []
      const cleanupPerm = useCleanup ? setup.cleanupPerm : ID_PERM
      const perm = composePerm(composePerm(setup.perm, algPerm), cleanupPerm)
      const after = applyPerm(state, perm)
      const reduced = reduceState(after)
      if (!reduced) continue
      const errors = validate(toCube3(reduced))
      if (errors.some((error) => error.kind === kind)) continue
      return { setup: setup.moves, cleanup, perm }
    }
  }
  throw new Error('Solver did not converge')
}

function solveParity4(run: Run4): void {
  for (let step = 0; step < 4; step++) {
    const reduced = reduceState(run.state)
    if (!reduced) throw new Error('Cube is not solvable')
    const errors = validate(toCube3(reduced))
    if (!errors.some((error) => error.kind === 'edgeFlip') && !errors.some((error) => error.kind === 'parity')) return
    const kind = errors.some((error) => error.kind === 'edgeFlip') ? 'edgeFlip' : 'parity'
    const algName = kind === 'edgeFlip' ? 'ollParity' : 'pllParity'
    const caseId = kind === 'edgeFlip' ? 'oll' : 'pll'
    const choice = findParityMacro(run.state, algName, kind)
    const step4: Step4 = {
      stage: 'parity',
      caseId,
      target: null,
      piece: null,
      focus: [],
      setup: choice.setup,
      algId: algName,
      repeat: 1,
      alg: ALGS4[algName],
      cleanup: choice.cleanup,
    }
    pushStep4(run, step4, choice.perm)
  }
  const reduced = reduceState(run.state)
  if (!reduced) throw new Error('Cube is not solvable')
  const errors = validate(toCube3(reduced))
  if (errors.some((error) => error.kind === 'edgeFlip') || errors.some((error) => error.kind === 'parity')) {
    throw new Error('Solver did not converge')
  }
}

function step3ToStep4(step: Step): Step4 {
  return {
    stage: step.stage,
    caseId: step.caseId,
    target: null,
    piece: step.piece,
    focus: [],
    setup: [...step.setup],
    algId: step.algId,
    repeat: step.repeat,
    alg: [...step.alg],
    cleanup: [],
  }
}

export function solve4(cube: Cube): Solution4 {
  if (cube.length !== 96) throw new Error('Expected 96 stickers')
  const run: Run4 = { state: toNums(cube), steps: [] }
  solveCentres4(run)
  solveEdges4(run)
  solveParity4(run)
  const reduced = reduceState(run.state)
  if (!reduced) throw new Error('Cube is not solvable')
  const solution3 = solve(toCube3(reduced))
  for (const step of solution3.steps) run.steps.push(step3ToStep4(step))
  return { steps: run.steps, moves: run.steps.flatMap((step) => [...step.setup, ...step.alg, ...step.cleanup]) }
}
