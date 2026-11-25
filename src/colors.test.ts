import { describe, expect, it } from 'vitest'
import { pieceLabel } from './colors'

describe('pieceLabel', () => {
  it('joins colour names with an en dash', () => {
    expect(pieceLabel('DFR')).toBe('trắng–xanh lá–cam')
    expect(pieceLabel('FR')).toBe('xanh lá–cam')
  })
})
