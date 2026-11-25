import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { Cube, CubeModel } from '../core'
import { CubeView } from '../three/CubeView'

export interface CubeCanvasHandle {
  setState(cube: Cube, highlight: readonly number[] | null): void
  animateMove(move: string, before: Cube, after: Cube, ms: number): Promise<void>
  resetCamera(): void
  setArrows(move: string | null): void
  setInteractive(onMove: ((move: string) => void) | null): void
}

interface Props {
  model: CubeModel
  initial: Cube
  initialHighlight?: readonly number[] | null
}

export const CubeCanvas = forwardRef<CubeCanvasHandle, Props>(function CubeCanvas(
  { model, initial, initialHighlight = null },
  ref,
) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<CubeView | null>(null)
  const latest = useRef({ initial, initialHighlight })
  latest.current = { initial, initialHighlight }

  useEffect(() => {
    const created = new CubeView(container.current!, model)
    created.setState(latest.current.initial, latest.current.initialHighlight)
    view.current = created
    return () => {
      created.dispose()
      view.current = null
    }
  }, [model])

  useImperativeHandle(ref, () => ({
    setState: (cube, highlight) => view.current?.setState(cube, highlight),
    animateMove: (move, before, after, ms) =>
      view.current ? view.current.animateMove(move, before, after, ms) : Promise.resolve(),
    resetCamera: () => view.current?.resetCamera(),
    setArrows: (move) => view.current?.setArrows(move),
    setInteractive: (onMove) => view.current?.setInteractive(onMove),
  }))

  return <div className="cube-canvas" ref={container} />
})
