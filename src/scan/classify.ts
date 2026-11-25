import type { Face } from '../core'

export type RGB = readonly [number, number, number]

export function guideRect(width: number, height: number, fraction = 0.7): { x: number; y: number; size: number } {
  const size = Math.round(Math.min(width, height) * fraction)
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size }
}

export function sampleGrid(data: ArrayLike<number>, size: number, n: number): RGB[] {
  const cell = size / n
  const span = (index: number) => {
    const from = Math.round(index * cell + cell * 0.3)
    const to = Math.max(from + 1, Math.round(index * cell + cell * 0.7))
    return [from, to] as const
  }
  const result: RGB[] = []
  for (let row = 0; row < n; row++) {
    const [y0, y1] = span(row)
    for (let col = 0; col < n; col++) {
      const [x0, x1] = span(col)
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * size + x) * 4
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
      }
      result.push([r / count, g / count, b / count])
    }
  }
  return result
}

export function classify([r, g, b]: RGB): Face {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const s = max === 0 ? 0 : delta / max
  const v = max / 255
  if (s < 0.25 && v > 0.4) return 'D'
  let h = 0
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta + 6) % 6)
    else if (max === g) h = 60 * ((b - r) / delta + 2)
    else h = 60 * ((r - g) / delta + 4)
  }
  if (h >= 340 || h < 10) return 'L'
  if (h < 40) return 'R'
  if (h < 75) return 'U'
  if (h < 165) return 'F'
  return 'B'
}

export function classifyFace(samples: readonly RGB[]): Face[] {
  return samples.map(classify)
}
