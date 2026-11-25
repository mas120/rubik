import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Shape,
  ShapeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { BODY_HEX, COLOUR_HEX } from '../colors'
import { STICKER_GEOMETRY, type Cube, type Move } from '../core'
import { moveRotation } from './moveRotation'

const DIM_TARGET = new Color('#222222')
const CAMERA_START = new Vector3(3.4, 3.2, 6.8)
const BASE_FOV = 34

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

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
    STICKER_GEOMETRY.forEach(({ pos, normal }) => {
      const material = new MeshBasicMaterial({ color: '#000000' })
      const mesh = new Mesh(stickerGeometry, material)
      const n = new Vector3(...normal)
      mesh.quaternion.copy(new Quaternion().setFromUnitVectors(up, n))
      mesh.position.copy(n.multiplyScalar(0.482))
      byPos.get(pos.join(','))!.add(mesh)
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

  private resetTransforms(): void {
    for (const { group } of this.cubies) {
      if (group.parent !== this.scene) this.scene.add(group)
    }
    this.pivot.quaternion.identity()
  }

  animateMove(move: Move, before: Cube, after: Cube, ms: number): Promise<void> {
    this.finishCurrent?.()
    this.resetTransforms()
    this.setState(before, this.highlight)
    const { axis, angle, whole } = moveRotation(move)
    const axisVector = new Vector3(...axis)
    for (const { group, pos } of this.cubies) {
      if (whole || pos[0] * axis[0] + pos[1] * axis[1] + pos[2] * axis[2] === 1) this.pivot.add(group)
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
