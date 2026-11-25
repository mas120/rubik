import { turnRotation, type CubeModel, type Vec } from '../core'

export interface TurnArrow {
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

export function turnArrows(model: CubeModel, move: string): TurnArrow[] {
  const spec = model.spec(move)
  const { axis, angle } = turnRotation(spec)
  const sign = Math.sign(angle)
  const double = spec.quarters === 2
  const size = 3 / model.n
  const sides = UNIT_VECTORS.filter((m) => m[0] * axis[0] + m[1] * axis[1] + m[2] * axis[2] === 0)
  const arrows: TurnArrow[] = []
  for (let depth = spec.from; depth <= spec.to; depth++) {
    const offset = ((model.n - 1) / 2 - depth) * size
    for (const m of sides) {
      const center = clean([
        offset * axis[0] + 1.5 * m[0],
        offset * axis[1] + 1.5 * m[1],
        offset * axis[2] + 1.5 * m[2],
      ])
      const c = cross(axis, m)
      arrows.push({ center, dir: clean([sign * c[0], sign * c[1], sign * c[2]]), normal: m, double })
    }
  }
  return arrows
}

