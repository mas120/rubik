import { FACE_NORMALS, type Face, type Move, type Vec } from '../core'

export interface MoveRotation {
  axis: Vec
  angle: number
  whole: boolean
}

export function moveRotation(move: Move): MoveRotation {
  const whole = move[0] === 'y'
  const axis = FACE_NORMALS[whole ? 'U' : (move[0] as Face)]
  const angle = move.endsWith('2') ? -Math.PI : move.endsWith("'") ? Math.PI / 2 : -Math.PI / 2
  return { axis, angle, whole }
}
