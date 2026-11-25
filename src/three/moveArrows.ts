import type { Move, Vec } from '../core'
import { moveRotation } from './moveRotation'

export interface MoveArrow {
  center: Vec
  dir: Vec
  normal: Vec
  double: boolean
}

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const clean = (v: Vec): Vec => [v[0] || 0, v[1] || 0, v[2] || 0]

const UNIT_VECTORS: Vec[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

export function moveArrows(move: Move): MoveArrow[] {
  const { axis, angle, whole } = moveRotation(move)
  const sign = Math.sign(angle)
  const double = move.endsWith('2')
  const heights = whole ? [-1, 0, 1] : [1]
  const sides = UNIT_VECTORS.filter((m) => m[0] * axis[0] + m[1] * axis[1] + m[2] * axis[2] === 0)
  return heights.flatMap((h) =>
    sides.map((m) => {
      const center = clean([h * axis[0] + 1.5 * m[0], h * axis[1] + 1.5 * m[1], h * axis[2] + 1.5 * m[2]])
      const c = cross(axis, m)
      const dir = clean([sign * c[0], sign * c[1], sign * c[2]])
      return { center, dir, normal: m, double }
    }),
  )
}
