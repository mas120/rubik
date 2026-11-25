import { describe, expect, it } from 'vitest'
import { MOVES, type Vec } from '../core'
import { moveArrows } from './moveArrows'
import { moveRotation } from './moveRotation'

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

describe('moveArrows', () => {
  it.each(MOVES)('describes real motion for %s', (move) => {
    const { axis, angle, whole } = moveRotation(move)
    const arrows = moveArrows(move)
    expect(arrows).toHaveLength(whole ? 12 : 4)
    for (const arrow of arrows) {
      expect(arrow.double).toBe(move.endsWith('2'))
      expect(arrow.dir.reduce((s, v) => s + Math.abs(v), 0)).toBe(1)
      expect(dot(arrow.dir, arrow.normal)).toBe(0)
      expect(dot(arrow.dir, axis)).toBe(0)
      const sign = Math.sign(angle)
      const motion = cross(axis, arrow.center)
      expect(sign * dot(motion, arrow.dir)).toBeGreaterThan(0)
      expect(dot(arrow.center, arrow.normal)).toBe(1.5)
    }
  })

  it('puts face-turn arrows on the turning layer', () => {
    const { axis } = moveRotation('R')
    for (const arrow of moveArrows('R')) expect(dot(arrow.center, axis)).toBe(1)
  })
})
