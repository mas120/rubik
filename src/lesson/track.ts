import { turnRotation, type Cube, type CubeModel, type TurnSpec } from '../core'

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

function rotationVector(spec: TurnSpec): [number, number, number] {
  const { axis, angle } = turnRotation(spec)
  const sign = Math.sign(angle)
  return [axis[0] * sign, axis[1] * sign, axis[2] * sign]
}

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const isWhole = (model: CubeModel, spec: TurnSpec) => spec.from === 0 && spec.to === model.n - 1

export function assistMove(model: CubeModel, expected: string, dragged: string): string {
  const e = model.spec(expected)
  if (e.from === e.to || isWhole(model, e)) return dragged
  const d = model.spec(dragged)
  if (d.from !== d.to || d.quarters === 2) return dragged
  const ev = rotationVector(e)
  const dv = rotationVector(d)
  if (Math.abs(dot(ev, dv)) < 0.5 * Math.hypot(...ev) * Math.hypot(...dv)) return dragged
  const depth = d.face === e.face ? d.from : model.n - 1 - d.from
  if (depth < e.from || depth > e.to) return dragged
  const wide = model.moves.find((m) => {
    const s = model.spec(m)
    return (
      s.face === e.face &&
      s.from === e.from &&
      s.to === e.to &&
      s.quarters !== 2 &&
      dot(rotationVector(s), dv) > 0
    )
  })
  return wide ?? dragged
}

export function remainingMoves(
  model: CubeModel,
  displayed: Cube,
  next: Cube,
  expected: string,
): string[] | null {
  const e = model.spec(expected)
  const ev = rotationVector(e)
  const expectedWhole = isWhole(model, e)
  const candidates = model.moves.filter((m) => {
    const s = model.spec(m)
    if (isWhole(model, s) && !expectedWhole) return false
    const v = rotationVector(s)
    return Math.abs(dot(ev, v)) > 0.5 * Math.hypot(...ev) * Math.hypot(...v)
  })
  const results = candidates.map((m) => model.apply(displayed, m))
  for (let i = 0; i < candidates.length; i++) if (sameCube(results[i], next)) return [candidates[i]]
  for (let i = 0; i < candidates.length; i++) {
    for (const m of candidates) {
      if (sameCube(model.apply(results[i], m), next)) return [candidates[i], m]
    }
  }
  return null
}
