import { describe, expect, it } from 'vitest'
import { MOVES, STICKER_GEOMETRY, applyMove, inLayer, type Cube, type Face, type Vec } from '../core'
import { moveRotation } from './moveRotation'

function rotate(v: Vec, axis: Vec, angle: number): Vec {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const d = axis[0] * v[0] + axis[1] * v[1] + axis[2] * v[2]
  const c: Vec = [
    axis[1] * v[2] - axis[2] * v[1],
    axis[2] * v[0] - axis[0] * v[2],
    axis[0] * v[1] - axis[1] * v[0],
  ]
  return [0, 1, 2].map((i) => Math.round(v[i] * cos + c[i] * sin + axis[i] * d * (1 - cos)) + 0) as unknown as Vec
}

const key = (pos: Vec, normal: Vec) => `${pos}|${normal}`
const INDEX = new Map(STICKER_GEOMETRY.map((g, i) => [key(g.pos, g.normal), i]))

describe('moveRotation', () => {
  it.each(MOVES)('matches the logical permutation for %s', (move) => {
    const { axis, angle, layer } = moveRotation(move)
    const idCube = Array.from({ length: 54 }, (_, i) => i) as unknown as Cube
    const result = applyMove(idCube, move) as unknown as number[]
    STICKER_GEOMETRY.forEach(({ pos, normal }, i) => {
      const moving = inLayer(pos, axis, layer)
      if (!moving) {
        expect(result[i]).toBe(i)
        return
      }
      const j = INDEX.get(key(rotate(pos, axis, angle), rotate(normal, axis, angle)))!
      expect(result[j]).toBe(i)
    })
  })

  it('uses the expected angles', () => {
    expect(moveRotation('U').angle).toBeCloseTo(-Math.PI / 2)
    expect(moveRotation("R'").angle).toBeCloseTo(Math.PI / 2)
    expect(moveRotation('y2').angle).toBeCloseTo(-Math.PI)
    expect(moveRotation('y').layer).toBe('whole')
    expect(moveRotation('F').layer).toBe('outer')
    expect(moveRotation('M').layer).toBe('middle')
    expect(moveRotation('x').layer).toBe('whole')
  })

  it('has the face as axis', () => {
    const faces: Face[] = ['U', 'R', 'F', 'D', 'L', 'B']
    for (const f of faces) {
      const { axis } = moveRotation(f)
      expect(axis.reduce((a, b) => a + Math.abs(b), 0)).toBe(1)
    }
  })
})
