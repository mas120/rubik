import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Cube, Move } from '../core'
import { CubeView } from '../three/CubeView'

export interface CubeCanvasHandle {
  setState(cube: Cube, highlight: readonly number[] | null): void
  animateMove(move: Move, before: Cube, after: Cube, ms: number): Promise<void>
  resetCamera(): void
}

interface Props {
  initial: Cube
  initialHighlight?: readonly number[] | null
}

export const CubeCanvas = forwardRef<CubeCanvasHandle, Props>(function CubeCanvas(
  { initial, initialHighlight = null },
  ref,
) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<CubeView | null>(null)
  const latest = useRef({ initial, initialHighlight })
  latest.current = { initial, initialHighlight }

  useEffect(() => {
    const created = new CubeView(container.current!)
    created.setState(latest.current.initial, latest.current.initialHighlight)
    view.current = created
    return () => {
      created.dispose()
      view.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    setState: (cube, highlight) => view.current?.setState(cube, highlight),
    animateMove: (move, before, after, ms) =>
      view.current ? view.current.animateMove(move, before, after, ms) : Promise.resolve(),
    resetCamera: () => view.current?.resetCamera(),
  }))

  return <div className="cube-canvas" ref={container} />
})
