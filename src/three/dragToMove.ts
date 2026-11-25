import { FACES, FACE_NORMALS, type Move, type Vec } from '../core'

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const SLICES: { reference: Vec; name: 'M' | 'E' | 'S' }[] = [
  { reference: FACE_NORMALS.L, name: 'M' },
  { reference: FACE_NORMALS.D, name: 'E' },
  { reference: FACE_NORMALS.F, name: 'S' },
]

export function dragToMove(pos: Vec, axis: Vec, sign: 1 | -1): Move {
  const c = dot(pos, axis)
  if (c === 0) {
    const slice = SLICES.find((s) => dot(s.reference, axis) !== 0)!
    return sign * dot(slice.reference, axis) === -1 ? slice.name : `${slice.name}'`
  }
  const normal: Vec = [c * axis[0] || 0, c * axis[1] || 0, c * axis[2] || 0]
  const face = FACES.find((f) => FACE_NORMALS[f].every((v, i) => v === normal[i]))
  return sign * c === -1 ? face! : `${face!}'`
}
