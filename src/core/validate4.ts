import { CORNER_SLOTS, FACES, mulberry32, type Cube, type Face } from './cube'
import { getModel } from './model'
import { readPieces } from './validate'

export type ValidationError4 =
  | { kind: 'colourCount'; colour: Face; count: number }
  | { kind: 'corners' }
  | { kind: 'cornerTwist' }
  | { kind: 'wings' }

const model = getModel(4)
const STICKERS = model.stickers

function extremeCount(cell: readonly number[]): number {
  return cell.filter((value) => value === 0 || value === 3).length
}


function toView(index3: number): number {
  const face = Math.floor(index3 / 9)
  const row = Math.floor((index3 % 9) / 3)
  const col = index3 % 3
  return face * 16 + (row === 2 ? 3 : row) * 4 + (col === 2 ? 3 : col)
}

const CORNER_VIEW = CORNER_SLOTS.map((slot) => slot.facelets.map(toView))

function cornerView54(cube: Cube): Cube {
  const view = Array<Face>(54).fill('U')
  CORNER_SLOTS.forEach((slot, s) => {
    slot.facelets.forEach((facelet, i) => {
      view[facelet] = cube[CORNER_VIEW[s][i]]
    })
  })
  return view
}

let rotationMoves: string[][] | null = null

function getRotationMoves(): string[][] {
  if (rotationMoves) return rotationMoves
  const turns = model.moves.filter((move) => /^[xyz]/.test(move))
  const key = (cube: Cube) => [0, 1, 2, 3, 4, 5].map((f) => cube[f * 16 + 5]).join('')
  const seen = new Set([key(model.solved)])
  const queue: { moves: string[]; cube: Cube }[] = [{ moves: [], cube: model.solved }]
  for (let head = 0; head < queue.length && queue.length < 24; head++) {
    for (const move of turns) {
      const cube = model.apply(queue[head].cube, move)
      const k = key(cube)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push({ moves: [...queue[head].moves, move], cube })
    }
  }
  rotationMoves = queue.map((entry) => entry.moves)
  return rotationMoves
}

const DBL = CORNER_SLOTS.findIndex((slot) => slot.name === 'DBL')

function homeFrame(cube: Cube): Cube | null {
  const slot = CORNER_SLOTS[DBL]
  for (const moves of getRotationMoves()) {
    const rotated = model.applyAll(cube, moves)
    if (slot.faces.every((face, i) => rotated[CORNER_VIEW[DBL][i]] === face)) return rotated
  }
  return null
}

function checkCorners(cube: Cube): ValidationError4[] {
  const framed = homeFrame(cube)
  if (!framed) return [{ kind: 'corners' }]
  const reading = readPieces(cornerView54(framed), CORNER_SLOTS)
  if (!reading) return [{ kind: 'corners' }]
  if (reading.orientation.reduce((a, b) => a + b, 0) % 3 !== 0) return [{ kind: 'cornerTwist' }]
  return []
}

interface WingTable {
  positions: [number, number][]
  lookup: Map<string, number>[]
}

let wingTable: WingTable | null = null

function getWingTable(): WingTable {
  if (wingTable) return wingTable
  const byCell = new Map<string, number[]>()
  STICKERS.forEach((sticker, i) => {
    if (extremeCount(sticker.cell) !== 2) return
    const key = sticker.cell.join(',')
    byCell.set(key, [...(byCell.get(key) ?? []), i])
  })
  const positions = [...byCell.values()].map((pair) => [pair[0], pair[1]] as [number, number])
  const pieceOf = new Map<number, number>()
  positions.forEach(([a, b], p) => {
    pieceOf.set(a, p)
    pieceOf.set(b, p)
  })
  const shows: Map<number, string>[] = positions.map(() => new Map())
  const ids = Array.from({ length: 96 }, (_, i) => i)
  let state = ids as unknown as Cube
  const rng = mulberry32(12345)
  let filled = 0
  const note = () => {
    positions.forEach(([a, b], p) => {
      const sa = state[a] as unknown as number
      const sb = state[b] as unknown as number
      const piece = pieceOf.get(sa)!
      if (pieceOf.get(sb) !== piece) throw new Error('Wing pieces are split')
      const colours = `${model.solved[sa]}${model.solved[sb]}`
      const known = shows[p].get(piece)
      if (known === undefined) {
        shows[p].set(piece, colours)
        filled++
      } else if (known !== colours) {
        throw new Error('Wing orientation is not unique')
      }
    })
  }
  note()
  for (let step = 0; step < 200000 && filled < positions.length * positions.length; step++) {
    state = model.apply(state, model.moves[Math.floor(rng() * model.moves.length)])
    note()
  }
  if (filled < positions.length * positions.length) throw new Error('Wing table incomplete')
  const lookup = shows.map((map) => {
    const inverse = new Map<string, number>()
    for (const [piece, colours] of map) {
      if (inverse.has(colours)) throw new Error('Wing colours are ambiguous')
      inverse.set(colours, piece)
    }
    return inverse
  })
  wingTable = { positions, lookup }
  return wingTable
}

function checkWings(cube: Cube): boolean {
  const { positions, lookup } = getWingTable()
  const used = new Set<number>()
  for (let p = 0; p < positions.length; p++) {
    const [a, b] = positions[p]
    const piece = lookup[p].get(`${cube[a]}${cube[b]}`)
    if (piece === undefined || used.has(piece)) return false
    used.add(piece)
  }
  return true
}

export function validate4(cube: Cube): ValidationError4[] {
  if (cube.length !== 96) throw new Error('Expected 96 stickers')
  const errors: ValidationError4[] = []
  for (const colour of FACES) {
    const count = cube.filter((s) => s === colour).length
    if (count !== 16) errors.push({ kind: 'colourCount', colour, count })
  }
  if (errors.length > 0) return errors
  errors.push(...checkCorners(cube))
  if (!checkWings(cube)) errors.push({ kind: 'wings' })
  return errors
}

