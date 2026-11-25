import { CORNER_SLOTS, EDGE_SLOTS, FACES, type Cube, type Face, type Slot } from './cube'

export type ValidationError =
  | { kind: 'centres' }
  | { kind: 'colourCount'; colour: Face; count: number }
  | { kind: 'pieces' }
  | { kind: 'edgeFlip' }
  | { kind: 'cornerTwist' }
  | { kind: 'parity' }

const CENTRES = FACES.map((_, f) => f * 9 + 4)

export function normalize(cube: Cube): Cube | null {
  const map = new Map<Face, Face>()
  CENTRES.forEach((index, f) => map.set(cube[index], FACES[f]))
  if (map.size !== 6) return null
  return cube.map((s) => map.get(s)!)
}

const setKey = (faces: readonly Face[]) => [...faces].sort().join('')

export interface PieceReading {
  home: number[]
  orientation: number[]
}

export function readPieces(cube: Cube, slots: readonly Slot[]): PieceReading | null {
  const homes = new Map(slots.map((s, i) => [setKey(s.faces), i]))
  const home: number[] = []
  const orientation: number[] = []
  for (const slot of slots) {
    const colours = slot.facelets.map((i) => cube[i])
    const h = homes.get(setKey(colours))
    if (h === undefined || home.includes(h)) return null
    const reference = slots[h].faces
    home.push(h)
    if (colours.length === 2) {
      orientation.push(colours[0] === reference[0] ? 0 : 1)
      continue
    }
    const twist = colours.findIndex((c) => c === 'U' || c === 'D')
    if (colours.some((c, i) => reference[(i + 3 - twist) % 3] !== c)) return null
    orientation.push(twist)
  }
  return { home, orientation }
}

function permutationParity(perm: readonly number[]): number {
  const seen = new Array<boolean>(perm.length).fill(false)
  let cycles = 0
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue
    cycles++
    for (let j = i; !seen[j]; j = perm[j]) seen[j] = true
  }
  return (perm.length - cycles) % 2
}

export function validate(cube: Cube): ValidationError[] {
  const errors: ValidationError[] = []
  const normalised = normalize(cube)
  if (!normalised) errors.push({ kind: 'centres' })

  for (const colour of FACES) {
    const count = cube.filter((s) => s === colour).length
    if (count !== 9) errors.push({ kind: 'colourCount', colour, count })
  }
  if (errors.length > 0 || !normalised) return errors

  const corners = readPieces(normalised, CORNER_SLOTS)
  const edges = readPieces(normalised, EDGE_SLOTS)
  if (!corners || !edges) return [{ kind: 'pieces' }]

  if (edges.orientation.reduce((a, b) => a + b, 0) % 2 !== 0) errors.push({ kind: 'edgeFlip' })
  if (corners.orientation.reduce((a, b) => a + b, 0) % 3 !== 0) errors.push({ kind: 'cornerTwist' })
  if (permutationParity(corners.home) !== permutationParity(edges.home)) errors.push({ kind: 'parity' })
  return errors
}
