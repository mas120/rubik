import { describe, expect, it } from 'vitest'
import { FACE_NORMALS, STICKER_GEOMETRY, type Vec } from '../core'
import { dragToMove } from './dragToMove'
import { moveRotation } from './moveRotation'

const AXES: Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const REFERENCE = [FACE_NORMALS.L, FACE_NORMALS.D, FACE_NORMALS.F]

describe('dragToMove', () => {
  it('maps every drag to a turn with matching rotation sense', () => {
    for (const { pos, normal } of STICKER_GEOMETRY) {
      for (const [axisIndex, axis] of AXES.entries()) {
        if (dot(axis, normal) !== 0) continue
        for (const sign of [1, -1] as const) {
          const c = dot(pos, axis)
          const rotation = moveRotation(dragToMove(pos, axis, sign))
          if (c === 0) {
            const reference = REFERENCE[axisIndex]
            expect(rotation.layer).toBe('middle')
            expect(rotation.axis).toEqual(reference)
            expect(Math.sign(rotation.angle)).toBe(sign * dot(reference, axis))
          } else {
            expect(rotation.layer).toBe('outer')
            expect(rotation.axis).toEqual([c * axis[0] || 0, c * axis[1] || 0, c * axis[2] || 0])
            expect(Math.sign(rotation.angle)).toBe(sign * c)
          }
        }
      }
    }
  })

  it('gives the expected moves', () => {
    expect(dragToMove([0, 1, 1], [0, 1, 0], -1)).toBe('U')
    expect(dragToMove([0, 1, 1], [0, 1, 0], 1)).toBe("U'")
    expect(dragToMove([1, 0, 1], [1, 0, 0], -1)).toBe('R')
    expect(dragToMove([-1, 0, 1], [1, 0, 0], 1)).toBe('L')
    expect(dragToMove([0, 1, 1], [1, 0, 0], 1)).toBe('M')
    expect(dragToMove([0, 0, 1], [0, 1, 0], 1)).toBe('E')
    expect(dragToMove([1, 1, 0], [0, 0, 1], -1)).toBe('S')
  })
})
