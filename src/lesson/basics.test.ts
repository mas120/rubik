import { describe, expect, it } from 'vitest'
import { getModel } from '../core'
import { basicsPages, type BasicsBlock } from './basics'
import { moveInstruction } from './guide'
import { STAGE_ORDER, STAGE_TEXT } from './texts'
import { STAGES4, STAGE_TEXT4 } from './texts4'

const lists = (blocks: BasicsBlock[]) =>
  blocks.filter((b): b is { ul: string[] } => 'ul' in b).map((b) => b.ul)

const titles = (items: string[]) => items.map((item) => item.split(':')[0])

describe('basicsPages', () => {
  for (const n of [3, 4] as const) {
    it(`has six pages for ${n}x${n}`, () => {
      expect(basicsPages(n)).toHaveLength(6)
    })

    it(`demo moves are valid for ${n}x${n}`, () => {
      const model = getModel(n)
      const demos = basicsPages(n).flatMap((page) => page.blocks.flatMap((b) => ('demo' in b ? b.demo : [])))
      expect(demos.length).toBeGreaterThan(0)
      for (const move of demos) {
        expect(() => moveInstruction(move)).not.toThrow()
        expect(model.parse(move)).toEqual([move])
      }
    })

    it(`stage bullets match the lesson stage titles for ${n}x${n}`, () => {
      const found = lists(basicsPages(n)[4].blocks)
      expect(titles(found.at(-1)!)).toEqual(STAGE_ORDER.map((id) => STAGE_TEXT[id].title))
      if (n === 4) expect(titles(found[0])).toEqual(STAGES4.slice(0, 2).map((id) => STAGE_TEXT4[id].title))
    })
  }

  it('keeps 4x4-only notation off the 3x3 page', () => {
    expect(JSON.stringify(basicsPages(3)[2])).not.toContain('Rw')
    expect(JSON.stringify(basicsPages(4)[2])).toContain('Rw')
  })
})
