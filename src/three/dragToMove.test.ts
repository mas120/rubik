import { describe, expect, it } from 'vitest'
import { STICKER_GEOMETRY, type Vec } from '../core'
import { dragToMove } from './dragToMove'
import { moveRotation } from './moveRotation'

const AXES: Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

describe('dragToMove', () => {
  it('maps every drag to a turn with matching rotation sense', () => {
    for (const { pos, normal } of STICKER_GEOMETRY) {
      for (const axis of AXES) {
        if (axis[0] * normal[0] + axis[1] * normal[1] + axis[2] * normal[2] !== 0) continue
        for (const sign of [1, -1] as const) {
          const c = pos[0] * axis[0] + pos[1] * axis[1] + pos[2] * axis[2]
          const move = dragToMove(pos, axis, sign)
          if (c === 0) {
            expect(move).toBeNull()
            continue
          }
          expect(move).not.toBeNull()
          const rotation = moveRotation(move!)
          expect(rotation.whole).toBe(false)
          expect(rotation.axis).toEqual([c * axis[0] || 0, c * axis[1] || 0, c * axis[2] || 0])
          expect(Math.sign(rotation.angle)).toBe(sign * c)
        }
      }
    }
  })

  it('gives the expected faces', () => {
    expect(dragToMove([0, 1, 1], [0, 1, 0], -1)).toBe('U')
    expect(dragToMove([0, 1, 1], [0, 1, 0], 1)).toBe("U'")
    expect(dragToMove([1, 0, 1], [1, 0, 0], -1)).toBe('R')
    expect(dragToMove([-1, 0, 1], [1, 0, 0], 1)).toBe('L')
  })
})
