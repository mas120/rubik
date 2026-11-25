import { describe, expect, it } from 'vitest'
import { getModel, turnRotation, type Vec } from '../core'
import { turnArrows } from './arrows'

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

describe.each([getModel(3), getModel(4)])('turnArrows for n = $n', (model) => {
  it.each(model.moves)('describes real motion for %s', (move) => {
    const spec = model.spec(move)
    const { axis, angle } = turnRotation(spec)
    const arrows = turnArrows(model, move)
    expect(arrows).toHaveLength(4 * (spec.to - spec.from + 1))
    for (const arrow of arrows) {
      expect(arrow.double).toBe(spec.quarters === 2)
      expect(arrow.dir.reduce((s, v) => s + Math.abs(v), 0)).toBe(1)
      expect(dot(arrow.dir, arrow.normal)).toBe(0)
      expect(dot(arrow.dir, axis)).toBe(0)
      expect(Math.sign(angle) * dot(cross(axis, arrow.center), arrow.dir)).toBeGreaterThan(0)
      expect(dot(arrow.center, arrow.normal)).toBe(1.5)
    }
  })
})

describe('arrow layers', () => {
  it('puts a single-layer arrow on that layer', () => {
    const model = getModel(4)
    const { axis } = turnRotation(model.spec('2R'))
    for (const arrow of turnArrows(model, '2R')) expect(dot(arrow.center, axis)).toBeCloseTo(0.375)
    for (const arrow of turnArrows(model, 'R')) expect(dot(arrow.center, axis)).toBeCloseTo(1.125)
    for (const arrow of turnArrows(getModel(3), 'R')) expect(dot(arrow.center, axis)).toBe(1)
  })
})
