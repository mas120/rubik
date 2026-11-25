import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
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
import { STICKER_GEOMETRY, inLayer, type Cube, type Move, type Vec } from '../core'
import { dragToMove } from './dragToMove'
import { moveArrows } from './moveArrows'
import { moveRotation } from './moveRotation'

const DIM_TARGET = new Color('#222222')
const CAMERA_START = new Vector3(3.4, 3.2, 6.8)
const BASE_FOV = 34

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

const ARROW_COLOUR = '#19e3ff'

function arrowShapes(double: boolean, grow: number): Shape[] {
  const half = 0.14 + grow
  const tip = 1.15 + grow * 1.8
  const headLength = 0.6
  const headHalf = 0.3 + grow
  const heads = double ? [tip, tip - 0.45] : [tip]
  const last = heads[heads.length - 1]
  const shaft = new Shape()
  shaft.moveTo(-1.15 - grow, -half)
  shaft.lineTo(last - headLength + 0.1, -half)
  shaft.lineTo(last - headLength + 0.1, half)
  shaft.lineTo(-1.15 - grow, half)
  shaft.closePath()
  const shapes = [shaft]
  for (const x of heads) {
    const head = new Shape()
    head.moveTo(x - headLength, -headHalf)
    head.lineTo(x, 0)
    head.lineTo(x - headLength, headHalf)
    head.closePath()
    shapes.push(head)
  }
  return shapes
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
  private cubies: { group: Group; pos: readonly [number, number, number] }[] = []
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
  private interactive: ((move: Move) => void) | null = null
  private drag: { id: number; x: number; y: number; index: number; fired: boolean } | null = null

  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
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
    const bodyGeometry = new BoxGeometry(0.96, 0.96, 0.96)
    const bodyMaterial = new MeshBasicMaterial({ color: BODY_HEX })
    const stickerGeometry = new ShapeGeometry(stickerShape(0.8, 0.14))
    const byPos = new Map<string, Group>()
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          const group = new Group()
          group.position.set(x, y, z)
          group.add(new Mesh(bodyGeometry, bodyMaterial))
          this.scene.add(group)
          this.cubies.push({ group, pos: [x, y, z] })
          byPos.set(`${x},${y},${z}`, group)
        }
      }
    }
    const up = new Vector3(0, 0, 1)
    STICKER_GEOMETRY.forEach(({ pos, normal }, index) => {
      const material = new MeshBasicMaterial({ color: '#000000' })
      const mesh = new Mesh(stickerGeometry, material)
      const n = new Vector3(...normal)
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(up, n))
      mesh.position.copy(n.multiplyScalar(0.482))
      byPos.get(pos.join(','))!.add(mesh)
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

  setInteractive(onMove: ((move: Move) => void) | null): void {
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
    const p = hit.object.parent.position
    const n = hit.face.normal
    const index = STICKER_GEOMETRY.findIndex(
      (g) =>
        g.pos[0] === Math.round(p.x) &&
        g.pos[1] === Math.round(p.y) &&
        g.pos[2] === Math.round(p.z) &&
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
    const { pos, normal } = STICKER_GEOMETRY[drag.index]
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.camera.updateMatrixWorld()
    const toScreen = (v: Vector3) => {
      const q = v.clone().project(this.camera)
      return new Vector2(((q.x + 1) / 2) * rect.width, ((1 - q.y) / 2) * rect.height)
    }
    const point = new Vector3(pos[0] + normal[0] * 0.48, pos[1] + normal[1] * 0.48, pos[2] + normal[2] * 0.48)
    const origin = toScreen(point)
    let best: { score: number; axis: Vec; sign: 1 | -1 } | null = null
    const axes: Vec[] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    for (const axis of axes) {
      if (axis[0] * normal[0] + axis[1] * normal[1] + axis[2] * normal[2] !== 0) continue
      for (const sign of [1, -1] as const) {
        const motion = new Vector3(...axis).cross(point)
        const facing = new Vector3(...normal)
        motion.addScaledVector(facing, -motion.dot(facing)).multiplyScalar(0.2 * sign)
        const delta = toScreen(point.clone().add(motion)).sub(origin)
        const score = (delta.x * dx + delta.y * dy) / ((delta.length() || 1) * length)
        if (!best || score > best.score) best = { score, axis, sign }
      }
    }
    const move = best ? dragToMove(pos, best.axis, best.sign) : null
    if (move) this.interactive?.(move)
  }

  private onPointerEnd = (event: PointerEvent): void => {
    if (!this.drag || this.drag.id !== event.pointerId) return
    this.drag = null
    this.controls.enabled = true
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) {
      this.renderer.domElement.releasePointerCapture(event.pointerId)
    }
  }

  setArrows(move: Move | null): void {
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
      for (const arrow of moveArrows(move)) {
        const normal = new Vector3(...arrow.normal)
        const dir = new Vector3(...arrow.dir)
        const side = new Vector3().crossVectors(normal, dir)
        const basis = new Matrix4().makeBasis(dir, side, normal)
        const layers: [number, number, string][] = [
          [0.04, 0.02, '#000000'],
          [0, 0.03, ARROW_COLOUR],
        ]
        for (const [grow, lift, colour] of layers) {
          const material = new MeshBasicMaterial({
            color: colour,
            side: DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2 - lift * 10,
            polygonOffsetUnits: -2,
          })
          const mesh = new Mesh(new ShapeGeometry(arrowShapes(arrow.double, grow)), material)
          mesh.matrixAutoUpdate = false
          mesh.matrix.copy(basis)
          mesh.matrix.setPosition(
            arrow.center[0] + normal.x * (lift - 0.018),
            arrow.center[1] + normal.y * (lift - 0.018),
            arrow.center[2] + normal.z * (lift - 0.018),
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

  animateMove(move: Move, before: Cube, after: Cube, ms: number): Promise<void> {
    this.finishCurrent?.()
    if (this.arrowGroup) this.arrowGroup.visible = false
    this.resetTransforms()
    this.setState(before, this.highlight)
    const { axis, angle, layer } = moveRotation(move)
    const axisVector = new Vector3(...axis)
    for (const { group, pos } of this.cubies) {
      if (inLayer(pos, axis, layer)) this.pivot.add(group)
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
