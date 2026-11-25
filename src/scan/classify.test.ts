import { describe, expect, it } from 'vitest'
import { COLOUR_HEX } from '../colors'
import type { Face } from '../core'
import { classify, guideRect, sampleGrid, type RGB } from './classify'

const toRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

const entries = Object.entries(COLOUR_HEX) as [Face, string][]

describe('classify', () => {
  it('maps every sticker colour to its own face', () => {
    for (const [face, hex] of entries) expect(classify(toRgb(hex))).toBe(face)
  })

  it('still works in dimmer light', () => {
    for (const [face, hex] of entries) {
      const [r, g, b] = toRgb(hex)
      expect(classify([r * 0.6, g * 0.6, b * 0.6])).toBe(face)
    }
  })
})

describe('sampleGrid', () => {
  const size = 120
  const palette: RGB[] = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [0, 255, 255],
    [255, 0, 255],
    [200, 100, 50],
    [50, 100, 200],
    [10, 20, 30],
    [90, 80, 70],
    [120, 130, 140],
    [250, 240, 230],
    [1, 2, 3],
    [60, 160, 60],
    [160, 60, 160],
    [33, 66, 99],
  ]

  for (const n of [3, 4]) {
    it(`averages each cell of a ${n}x${n} grid in row-major order, ignoring borders`, () => {
      const data = new Uint8ClampedArray(size * size * 4)
      const cell = size / n
      const expected: RGB[] = []
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
          const colour = palette[row * n + col]
          expected.push(colour)
          for (let y = row * cell; y < (row + 1) * cell; y++) {
            for (let x = col * cell; x < (col + 1) * cell; x++) {
              const border =
                y < row * cell + 2 || y >= (row + 1) * cell - 2 || x < col * cell + 2 || x >= (col + 1) * cell - 2
              const i = (y * size + x) * 4
              data.set(border ? [0, 0, 0, 255] : [...colour, 255], i)
            }
          }
        }
      }
      expect(sampleGrid(data, size, n)).toEqual(expected)
    })
  }
})

describe('guideRect', () => {
  it('centres a square in landscape and portrait frames', () => {
    expect(guideRect(1280, 720)).toEqual({ x: 388, y: 108, size: 504 })
    expect(guideRect(720, 1280)).toEqual({ x: 108, y: 388, size: 504 })
  })
})
