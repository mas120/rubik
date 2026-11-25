import type { Cube, CubeModel } from '../core'

const sameCube = (a: Cube, b: Cube) => a.every((s, i) => s === b[i])

export function applyUserMove(
  model: CubeModel,
  base: Cube,
  next: Cube | null,
  extra: readonly string[],
  move: string,
): { advance: boolean; extra: string[] } {
  const displayed = model.applyAll(base, extra)
  const after = model.apply(displayed, move)
  if (next && sameCube(after, next)) return { advance: true, extra: [] }
  if (sameCube(after, base)) return { advance: false, extra: [] }
  const last = extra.at(-1)
  if (last !== undefined && model.invert(move) === last) return { advance: false, extra: extra.slice(0, -1) }
  return { advance: false, extra: [...extra, move] }
}

const layerKey = (move: string) => (move.endsWith("'") || move.endsWith('2') ? move.slice(0, -1) : move)

export function isHalfTurnPartial(expected: string, extra: readonly string[]): boolean {
  return (
    expected.endsWith('2') &&
    extra.length === 1 &&
    layerKey(extra[0]) === layerKey(expected) &&
    !extra[0].endsWith('2')
  )
}
