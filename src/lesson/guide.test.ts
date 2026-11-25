import { describe, expect, it } from 'vitest'
import { MOVE_DESC } from './texts'
import { MOVE_DESC4 } from './texts4'
import { moveInstruction, notationLegend } from './guide'

describe('moveInstruction', () => {
  it('explains quarter turns with direction', () => {
    expect(moveInstruction("F'")).toBe(
      'Xoay mặt trước (mặt đang hướng về bạn) một phần tư vòng (90°), ngược chiều kim đồng hồ.',
    )
    expect(moveInstruction('R')).toBe(
      'Xoay mặt bên phải một phần tư vòng (90°), đẩy phần phía trước đi lên.',
    )
    expect(moveInstruction('M')).toBe(
      'Xoay lớp giữa dọc (nằm giữa mặt trái và mặt phải) một phần tư vòng (90°), kéo phần phía trước đi xuống.',
    )
  })

  it('explains half turns', () => {
    expect(moveInstruction('U2')).toBe('Xoay tầng trên cùng nửa vòng (180°), theo chiều nào cũng được.')
    expect(moveInstruction('2R2')).toBe(
      'Xoay lớp thứ hai tính từ bên phải (mặt phải ngoài cùng đứng yên) nửa vòng (180°), theo chiều nào cũng được.',
    )
  })

  it('explains wide and inner layer moves', () => {
    expect(moveInstruction('Rw')).toBe(
      'Xoay hai lớp bên phải cùng lúc một phần tư vòng (90°), đẩy phần phía trước đi lên.',
    )
    expect(moveInstruction("Rw'")).toBe(
      'Xoay hai lớp bên phải cùng lúc một phần tư vòng (90°), kéo phần phía trước đi xuống.',
    )
    expect(moveInstruction('2R')).toBe(
      'Xoay lớp thứ hai tính từ bên phải (mặt phải ngoài cùng đứng yên) một phần tư vòng (90°), đẩy phần phía trước đi lên.',
    )
    expect(moveInstruction("2U'")).toBe(
      'Xoay tầng thứ hai tính từ trên xuống (tầng trên cùng đứng yên) một phần tư vòng (90°), đưa phần phía trước sang phải.',
    )
  })

  it('explains whole-cube rotations', () => {
    expect(moveInstruction("y'")).toBe(
      'Cầm cả khối và xoay khối sang phải (mặt bên trái quay về phía bạn), không xoay riêng lớp nào.',
    )
    expect(moveInstruction('x2')).toBe(
      'Cầm cả khối và lật khối nửa vòng (mặt trên thành mặt dưới), không xoay riêng lớp nào.',
    )
  })

  it('covers every described move', () => {
    for (const move of [...Object.keys(MOVE_DESC), ...Object.keys(MOVE_DESC4)]) {
      expect(() => moveInstruction(move)).not.toThrow()
    }
  })

  it('rejects unknown moves', () => {
    expect(() => moveInstruction('Q')).toThrow()
  })
})

describe('notationLegend', () => {
  it('has extra lines for 4x4', () => {
    expect(notationLegend(3)).toHaveLength(8)
    expect(notationLegend(4)).toHaveLength(10)
  })
})
