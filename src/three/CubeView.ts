import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Path,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { BODY_HEX, COLOUR_HEX } from '../colors'
import { inTurn, turnRotation, type Cube, type CubeModel, type Vec } from '../core'
import { turnArrows } from './arrows'

const DIM_TARGET = new Color('#222222')
const CAMERA_START = new Vector3(3.4, 3.2, 6.8)
const BASE_FOV = 34

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const ARROW_STYLE = {
  colour: '#19e3ff',
  rimColour: '#0b0d12',
  rimOpacity: 0.7,
  rim: 0.022,
  length: 0.62,
  tailHalf: 0.035,
  shaftHalf: 0.085,
  headLength: 0.3,
  headWidth: 0.36,
  notch: 0.08,
  secondHead: 0.26,
  tailAlpha: 0.25,
  headAlpha: 1,
  tailSegments: 8,
  rimLift: 0.02,
  fillLift: 0.03,
}

type Point = [number, number]

function arrowPolygons(double: boolean, size: number, faceWidth: number): Point[][] {
  const st = ARROW_STYLE
  const total = st.length * faceWidth
  const tail = -total / 2
  const tip = total / 2
  const w0 = st.tailHalf * size
  const w1 = st.shaftHalf * size
  const hl = st.headLength * size
  const hw = (st.headWidth * size) / 2
  const notch = st.notch * size
  const x0 = tail + w0
  const tipOf = (second: boolean) => (second ? tip - st.secondHead * size : tip)
  const polygons: Point[][] = []
  const lead = tipOf(double)
  const base = lead - hl
  const junction = base + notch
  const body: Point[] = [
    [x0, -w0],
    [junction, -w1],
    [base, -hw],
    [lead, 0],
    [base, hw],
    [junction, w1],
    [x0, w0],
  ]
  for (let i = 1; i < st.tailSegments; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / st.tailSegments
    body.push([x0 + Math.cos(angle) * w0, Math.sin(angle) * w0])
  }
  polygons.push(body)
  if (double) {
    const frontBase = tip - hl
    const frontJunction = frontBase + notch
    polygons.push([
      [frontBase, -hw],
      [tip, 0],
      [frontBase, hw],
      [frontJunction, w1],
      [frontJunction, -w1],
    ])
  }
  return polygons
}

function offsetPolygon(points: Point[], distance: number): Point[] {
  const count = points.length
  return points.map((point, i) => {
    const prev = points[(i + count - 1) % count]
    const next = points[(i + 1) % count]
    const edge = (from: Point, to: Point): Point => {
      const dx = to[0] - from[0]
      const dy = to[1] - from[1]
      const length = Math.hypot(dx, dy) || 1
      return [dy / length, -dx / length]
    }
    const n1 = edge(prev, point)
    const n2 = edge(point, next)
    const denominator = Math.max(1 + n1[0] * n2[0] + n1[1] * n2[1], 0.25)
    return [point[0] + ((n1[0] + n2[0]) / denominator) * distance, point[1] + ((n1[1] + n2[1]) / denominator) * distance]
  })
}

function toShape(points: Point[], hole?: Point[]): Shape {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)))
  if (hole) shape.holes.push(new Path(hole.map(([x, y]) => new Vector2(x, y))))
  return shape
}

function arrowGeometries(double: boolean, size: number, faceWidth: number): { fill: ShapeGeometry; rim: ShapeGeometry } {
  const st = ARROW_STYLE
  const polygons = arrowPolygons(double, size, faceWidth)
  const fill = new ShapeGeometry(polygons.map((polygon) => toShape(polygon)))
  const rim = new ShapeGeometry(
    polygons.map((polygon) => toShape(offsetPolygon(polygon, st.rim * size), polygon)),
  )
  const total = st.length * faceWidth
  const position = fill.getAttribute('position')
  const colour = new Color(st.colour)
  const values = new Float32Array(position.count * 4)
  for (let i = 0; i < position.count; i++) {
    const t = Math.min(1, Math.max(0, (position.getX(i) + total / 2) / total))
    values[i * 4] = colour.r
    values[i * 4 + 1] = colour.g
    values[i * 4 + 2] = colour.b
    values[i * 4 + 3] = st.tailAlpha + (st.headAlpha - st.tailAlpha) * t
  }
  fill.setAttribute('color', new Float32BufferAttribute(values, 4))
  return { fill, rim }
}

function stickerShape(size: number, radius: number): Shape {
  const h = size / 2
  const s = new Shape()
  s.moveTo(-h + radius, -h)
  s.lineTo(h - radius, -h)
  s.quadraticCurveTo(h, -h, h, -h + radius)
  s.lineTo(h, h - radius)
  s.quadraticCurveTo(h, h, h - radius, h)
  s.lineTo(-h + radius, h)
  s.quadraticCurveTo(-h, h, -h, h - radius)
  s.lineTo(-h, -h + radius)
  s.quadraticCurveTo(-h, -h, -h + radius, -h)
  return s
}

export class CubeView {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(BASE_FOV, 1, 0.1, 100)
  private controls: OrbitControls
  private pivot = new Group()
  private cubies: { group: Group; cell: readonly [number, number, number] }[] = []
  private model: CubeModel
  private size: number
  private stickers: MeshBasicMaterial[] = []
  private observer: ResizeObserver
  private frame = 0
  private cube: Cube | null = null
  private highlight: readonly number[] | null = null
  private finishCurrent: (() => void) | null = null
  private disposed = false
  private raycaster = new Raycaster()
  private stickerIndex = new Map<object, number>()
  private arrowGroup: Group | null = null
  private interactive: ((move: string) => void) | null = null
  private drag: { id: number; x: number; y: number; index: number; fired: boolean } | null = null

  private container: HTMLElement

  constructor(container: HTMLElement, model: CubeModel) {
    this.container = container
    this.model = model
    this.size = 3 / model.n
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.domElement.style.touchAction = 'none'
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    this.scene.add(this.pivot)
    this.buildCubies()

    this.camera.position.copy(CAMERA_START)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableZoom = false
    this.controls.enablePan = false
    this.controls.enableDamping = false
    this.controls.addEventListener('change', this.requestRender)
    this.controls.update()
    const dom = this.renderer.domElement
    dom.addEventListener('pointerdown', this.onPointerDown, { capture: true })
    dom.addEventListener('pointermove', this.onPointerMove)
    dom.addEventListener('pointerup', this.onPointerEnd)
    dom.addEventListener('pointercancel', this.onPointerEnd)

    this.observer = new ResizeObserver(this.resize)
    this.observer.observe(container)
    this.resize()
  }

  private buildCubies(): void {
    const { n } = this.model
    const size = this.size
    const k = n - 1
    const bodyGeometry = new BoxGeometry(0.96 * size, 0.96 * size, 0.96 * size)
    const bodyMaterial = new MeshBasicMaterial({ color: BODY_HEX })
    const stickerGeometry = new ShapeGeometry(stickerShape(0.8 * size, 0.14 * size))
    const byCell = new Map<string, Group>()
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          if (![x, y, z].some((c) => c === 0 || c === k)) continue
          const group = new Group()
          group.position.set((x - k / 2) * size, (y - k / 2) * size, (z - k / 2) * size)
          group.add(new Mesh(bodyGeometry, bodyMaterial))
          this.scene.add(group)
          this.cubies.push({ group, cell: [x, y, z] })
          byCell.set(`${x},${y},${z}`, group)
        }
      }
    }
    const up = new Vector3(0, 0, 1)
    this.model.stickers.forEach(({ cell, normal }, index) => {
      const material = new MeshBasicMaterial({ color: '#000000' })
      const mesh = new Mesh(stickerGeometry, material)
      const direction = new Vector3(...normal)
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(up, direction))
      mesh.position.copy(direction.multiplyScalar(0.482 * size))
      byCell.get(cell.join(','))!.add(mesh)
      this.stickerIndex.set(mesh, index)
      this.stickers.push(material)
    })
  }

  private resize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.renderer.domElement.style.width = `${width}px`
    this.renderer.domElement.style.height = `${height}px`
    const aspect = width / height
    this.camera.aspect = aspect
    const half = Math.tan((BASE_FOV * Math.PI) / 360)
    this.camera.fov = aspect >= 1 ? BASE_FOV : (2 * Math.atan(half / aspect) * 180) / Math.PI
    this.camera.updateProjectionMatrix()
    this.requestRender()
  }

  private requestRender = (): void => {
    if (this.frame || this.disposed) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.renderNow()
    })
  }

  private renderNow(): void {
    if (this.disposed) return
    this.renderer.render(this.scene, this.camera)
  }

  setState(cube: Cube, highlight: readonly number[] | null = null): void {
    this.cube = cube
    this.highlight = highlight
    const lit = highlight ? new Set(highlight) : null
    this.stickers.forEach((material, i) => {
      material.color.set(COLOUR_HEX[cube[i]])
      if (lit && !lit.has(i)) material.color.lerp(DIM_TARGET, 0.7)
    })
    this.requestRender()
  }

  setInteractive(onMove: ((move: string) => void) | null): void {
    this.interactive = onMove
  }

  private pickSticker(event: PointerEvent): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const ndc = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.camera.updateMatrixWorld()
    this.raycaster.setFromCamera(ndc, this.camera)
    const hit = this.raycaster.intersectObjects(
      this.cubies.map((c) => c.group),
      true,
    )[0]
    if (!hit) return null
    const direct = this.stickerIndex.get(hit.object)
    if (direct !== undefined) return direct
    if (!hit.face || !hit.object.parent) return null
    const cubie = this.cubies.find((c) => c.group === hit.object.parent)
    if (!cubie) return null
    const n = hit.face.normal
    const index = this.model.stickers.findIndex(
      (g) =>
        g.cell[0] === cubie.cell[0] &&
        g.cell[1] === cubie.cell[1] &&
        g.cell[2] === cubie.cell[2] &&
        g.normal[0] === Math.round(n.x) &&
        g.normal[1] === Math.round(n.y) &&
        g.normal[2] === Math.round(n.z),
    )
    return index >= 0 ? index : null
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.interactive || this.finishCurrent || event.button !== 0 || this.drag) return
    const index = this.pickSticker(event)
    if (index === null) return
    this.controls.enabled = false
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, index, fired: false }
    this.renderer.domElement.setPointerCapture(event.pointerId)
  }

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || drag.fired || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    const length = Math.hypot(dx, dy)
    if (length < 14) return
    drag.fired = true
    const { cell, normal } = this.model.stickers[drag.index]
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.camera.updateMatrixWorld()
    const toScreen = (v: Vector3) => {
      const q = v.clone().project(this.camera)
      return new Vector2(((q.x + 1) / 2) * rect.width, ((1 - q.y) / 2) * rect.height)
    }
    const k = (this.model.n - 1) / 2
    const point = new Vector3(
      (cell[0] - k) * this.size + normal[0] * 0.48 * this.size,
      (cell[1] - k) * this.size + normal[1] * 0.48 * this.size,
      (cell[2] - k) * this.size + normal[2] * 0.48 * this.size,
    )
    const origin = toScreen(point)
    let best: { score: number; axis: 0 | 1 | 2; sign: 1 | -1 } | null = null
    const axes: Vec[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    axes.forEach((axis, axisIndex) => {
      if (axis[0] * normal[0] + axis[1] * normal[1] + axis[2] * normal[2] !== 0) return
      for (const sign of [1, -1] as const) {
        const motion = new Vector3(...axis).cross(point)
        const facing = new Vector3(...normal)
        motion.addScaledVector(facing, -motion.dot(facing)).multiplyScalar(0.2 * sign)
        const delta = toScreen(point.clone().add(motion)).sub(origin)
        const score = (delta.x * dx + delta.y * dy) / ((delta.length() || 1) * length)
        if (!best || score > best.score) best = { score, axis: axisIndex as 0 | 1 | 2, sign }
      }
    })
    const chosen = best as { axis: 0 | 1 | 2; sign: 1 | -1 } | null
    if (chosen) this.interactive?.(this.model.dragMove(chosen.axis, cell[chosen.axis], chosen.sign))
  }

  private onPointerEnd = (event: PointerEvent): void => {
    if (!this.drag || this.drag.id !== event.pointerId) return
    this.drag = null
    this.controls.enabled = true
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId)
    }
  }

  setArrows(move: string | null): void {
    if (this.arrowGroup) {
      this.scene.remove(this.arrowGroup)
      this.arrowGroup.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          ;(o.material as MeshBasicMaterial).dispose()
        }
      })
      this.arrowGroup = null
    }
    if (move) {
      const group = new Group()
      const size = this.size
      for (const arrow of turnArrows(this.model, move)) {
        const normal = new Vector3(...arrow.normal)
        const dir = new Vector3(...arrow.dir)
        const side = new Vector3().crossVectors(normal, dir)
        const basis = new Matrix4().makeBasis(dir, side, normal)
        const { fill, rim } = arrowGeometries(arrow.double, size, 3)
        const layers = [
          {
            geometry: rim,
            lift: ARROW_STYLE.rimLift,
            order: 1,
            material: new MeshBasicMaterial({
              color: ARROW_STYLE.rimColour,
              opacity: ARROW_STYLE.rimOpacity,
              transparent: true,
              depthWrite: false,
              side: DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -2.2,
              polygonOffsetUnits: -2,
            }),
          },
          {
            geometry: fill,
            lift: ARROW_STYLE.fillLift,
            order: 2,
            material: new MeshBasicMaterial({
              color: '#ffffff',
              vertexColors: true,
              transparent: true,
              depthWrite: false,
              side: DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: -2.4,
              polygonOffsetUnits: -2,
            }),
          },
        ]
        for (const { geometry, lift, order, material } of layers) {
          const mesh = new Mesh(geometry, material)
          mesh.renderOrder = order
          mesh.matrixAutoUpdate = false
          mesh.matrix.copy(basis)
          const offset = lift * size - 0.018 * size
          mesh.matrix.setPosition(
            arrow.center[0] + normal.x * offset,
            arrow.center[1] + normal.y * offset,
            arrow.center[2] + normal.z * offset,
          )
          group.add(mesh)
        }
      }
      this.arrowGroup = group
      this.scene.add(group)
    }
    this.requestRender()
  }

  private resetTransforms(): void {
    for (const { group } of this.cubies) {
      if (group.parent !== this.scene) this.scene.add(group)
    }
    this.pivot.quaternion.identity()
  }

  animateMove(move: string, before: Cube, after: Cube, ms: number): Promise<void> {
    this.finishCurrent?.()
    if (this.arrowGroup) this.arrowGroup.visible = false
    this.resetTransforms()
    this.setState(before, this.highlight)
    const spec = this.model.spec(move)
    const { axis, angle } = turnRotation(spec)
    const axisVector = new Vector3(...axis)
    for (const { group, cell } of this.cubies) {
      if (inTurn(this.model.n, spec, cell)) this.pivot.add(group)
    }
    return new Promise((resolve) => {
      const start = performance.now()
      let raf = 0
      let done = false
      const finish = () => {
        if (done) return
        done = true
        cancelAnimationFrame(raf)
        this.resetTransforms()
        this.finishCurrent = null
        this.setState(after, this.highlight)
        this.renderNow()
        resolve()
      }
      this.finishCurrent = finish
      const tick = () => {
        if (done) return
        const t = Math.min(1, (performance.now() - start) / ms)
        this.pivot.setRotationFromAxisAngle(axisVector, angle * ease(t))
        this.renderNow()
        if (t >= 1) finish()
        else raf = requestAnimationFrame(tick)
      }
      tick()
    })
  }

  resetCamera(): void {
    this.camera.position.copy(CAMERA_START)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    this.requestRender()
  }

  dispose(): void {
    this.finishCurrent?.()
    this.disposed = true
    cancelAnimationFrame(this.frame)
    this.observer.disconnect()
    this.controls.removeEventListener('change', this.requestRender)
    const dom = this.renderer.domElement
    dom.removeEventListener('pointerdown', this.onPointerDown, { capture: true })
    dom.removeEventListener('pointermove', this.onPointerMove)
    dom.removeEventListener('pointerup', this.onPointerEnd)
    dom.removeEventListener('pointercancel', this.onPointerEnd)
    this.controls.dispose()
    this.scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose()
    })
    this.stickers.forEach((m) => m.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  get state(): Cube | null {
    return this.cube
  }
}
