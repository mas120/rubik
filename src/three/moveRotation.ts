import { FACE_NORMALS, type Face, type Layer, type Move, type Vec } from '../core'

export interface MoveRotation {
  axis: Vec
  angle: number
  layer: Layer
}

const REFERENCE: Record<string, { face: Face; layer: Layer }> = {
  M: { face: 'L', layer: 'middle' },
  E: { face: 'D', layer: 'middle' },
  S: { face: 'F', layer: 'middle' },
  x: { face: 'R', layer: 'whole' },
  y: { face: 'U', layer: 'whole' },
  z: { face: 'F', layer: 'whole' },
}

export function moveRotation(move: Move): MoveRotation {
  const special = REFERENCE[move[0]]
  const face = special ? special.face : (move[0] as Face)
  const layer = special ? special.layer : 'outer'
  const angle = move.endsWith('2') ? -Math.PI : move.endsWith("'") ? Math.PI / 2 : -Math.PI / 2
  return { axis: FACE_NORMALS[face], angle, layer }
}
