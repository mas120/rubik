import type { Face } from './core'

export const COLOUR_NAME: Record<Face, string> = {
  U: 'vàng',
  D: 'trắng',
  F: 'xanh lá',
  R: 'cam',
  L: 'đỏ',
  B: 'xanh dương',
}

export const COLOUR_HEX: Record<Face, string> = {
  U: '#ffd500',
  D: '#ffffff',
  F: '#009b48',
  R: '#ff5800',
  L: '#b71234',
  B: '#0046ad',
}

export const BODY_HEX = '#111111'

export function pieceLabel(piece: string): string {
  return [...piece].map((f) => COLOUR_NAME[f as Face]).join('–')
}
