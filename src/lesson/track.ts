import { applyMove, invertMove, type Cube, type Move } from '../core'

const sameCube = (a: Cube, b: Cube) => a.every((s, i) => s === b[i])

export function applyUserMove(
  base: Cube,
  next: Cube | null,
  extra: readonly Move[],
  move: Move,
): { advance: boolean; extra: Move[] } {
  let displayed = base
  for (const m of extra) displayed = applyMove(displayed, m)
  const after = applyMove(displayed, move)
  if (next && sameCube(after, next)) return { advance: true, extra: [] }
  if (sameCube(after, base)) return { advance: false, extra: [] }
  const last = extra.at(-1)
  if (last !== undefined && invertMove(move) === last) return { advance: false, extra: extra.slice(0, -1) }
  return { advance: false, extra: [...extra, move] }
}

export function isHalfTurnPartial(expected: Move, extra: readonly Move[]): boolean {
  return (
    expected.endsWith('2') &&
    extra.length === 1 &&
    extra[0][0] === expected[0] &&
    !extra[0].endsWith('2')
  )
}
