import { describe, expect, it } from 'vitest'
import { centreWarning, scanSteps } from './texts'

describe('scanSteps', () => {
  it('lists four steps starting with the hold instruction', () => {
    const steps = scanSteps(3, 'x')
    expect(steps).toHaveLength(4)
    expect(steps[0]).toBe('x')
    expect(steps[2]).toContain('9 ô')
  })

  it('counts 16 cells for a 4x4', () => {
    expect(scanSteps(4, 'x')[2]).toContain('16 ô')
  })
})

describe('centreWarning', () => {
  it('names the seen and expected colours', () => {
    expect(centreWarning('R', 'F')).toBe(
      'Ô giữa đang được nhận là màu cam, nhưng mặt này phải có tâm xanh lá. Hãy kiểm tra lại cách cầm khối.',
    )
  })
})
