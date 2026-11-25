import { FACES, FACE_NORMALS, type Move, type Vec } from '../core'

export function dragToMove(pos: Vec, axis: Vec, sign: 1 | -1): Move | null {
  const c = pos[0] * axis[0] + pos[1] * axis[1] + pos[2] * axis[2]
  if (c === 0) return null
  const normal: Vec = [c * axis[0] || 0, c * axis[1] || 0, c * axis[2] || 0]
  const face = FACES.find((f) => FACE_NORMALS[f].every((v, i) => v === normal[i]))
  if (!face) return null
  return sign * c === -1 ? face : `${face}'`
}
