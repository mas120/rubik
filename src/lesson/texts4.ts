import { COLOUR_NAME } from '../colors'
import type { Face } from '../core'
import { MOVE_DESC } from './texts'

export const STAGES4 = ['centres', 'edges', 'parity'] as const

export const STAGE_TEXT4: Record<(typeof STAGES4)[number], { title: string; goal: string }> = {
  centres: {
    title: 'Ghép tâm',
    goal: 'Khối 4×4 không có ô tâm cố định. Ghép 4 ô tâm cùng màu thành một khối 2×2 trên mỗi mặt: trắng ở dưới trước, rồi vàng ở trên, cuối cùng là bốn mặt bên theo đúng thứ tự màu.',
  },
  edges: {
    title: 'Ghép cặp cạnh',
    goal: 'Mỗi cạnh của 4×4 gồm hai viên nhỏ. Ghép hai viên cùng màu lại thành một cặp cho đủ 12 cạnh, không làm hỏng các tâm.',
  },
  parity: {
    title: 'Lỗi chẵn lẻ',
    goal: 'Khối 4×4 có thể rơi vào tình huống không thể xảy ra trên 3×3. Sửa ngay bây giờ bằng một công thức dài, để phần giải như 3×3 phía sau không bị kẹt.',
  },
}

export const FIRST_3X3_PREFIX =
  'Từ đây khối đã thành một khối 3×3 lớn: chỉ xoay các mặt ngoài, coi mỗi khối tâm 2×2 là một tâm và mỗi cặp cạnh là một cạnh. '

export const ALG_LABEL4: Record<string, string> = {
  centreA: 'Chèn tâm',
  centreA2: 'Chèn tâm',
  centreB: 'Chèn tâm',
  centreB2: 'Chèn tâm',
  centreC: 'Chèn tâm',
  centreCycle3: 'Đổi ba ô tâm',
  pairA: 'Ghép cạnh',
  pairB: 'Ghép cạnh',
  pairC: 'Tách lệch cạnh',
  pairFlip: 'Lật cạnh',
  pairLast: 'Ghép hai cạnh cuối',
  wingCycle3: 'Đổi ba viên cạnh',
  ollParity: 'Lật cạnh (chẵn lẻ)',
  pllParity: 'Đổi hai cạnh (chẵn lẻ)',
}

export function explain4(caseId: string, target: Face | null): string | null {
  const colour = target ? COLOUR_NAME[target] : ''
  switch (caseId) {
    case 'centreD':
      return 'Đưa thêm ô tâm trắng (đang sáng) vào mặt dưới.'
    case 'centreU':
      return 'Đưa thêm ô tâm vàng (đang sáng) vào mặt trên, không làm hỏng tâm trắng.'
    case 'centreSides':
      return `Đưa thêm ô tâm ${colour} (đang sáng) vào đúng mặt của nó, giữ nguyên các tâm đã xong.`
    case 'centreCycle':
      return 'Các ô tâm còn sai nằm ở vị trí khó nên dùng công thức đổi chỗ ba ô tâm. Các nước chuẩn bị đưa ba ô đó về vị trí của công thức, sau cùng trả lại như cũ.'
    case 'pairA':
    case 'pairB':
      return 'Hai viên cạnh cùng màu (đang sáng) nằm lệch tầng. Xoay hai tầng để chúng gặp nhau, thay cạnh vừa ghép bằng một cạnh chưa ghép, rồi trả hai tầng về để giữ tâm.'
    case 'pairC':
      return 'Hai viên cạnh cùng màu nằm cùng tầng nên chưa ghép được. Công thức này đưa chúng về thế lệch tầng.'
    case 'pairFlip':
      return 'Lật cạnh này để hai viên cùng màu có thể gặp nhau.'
    case 'pairLast':
      return 'Dùng công thức ghép hai cạnh cuối: nó ghép cặp mà không cần cạnh nào khác để thay vào.'
    case 'edgeCycle':
      return 'Dùng công thức đổi chỗ ba viên cạnh để ghép cặp còn lại. Các nước chuẩn bị đưa ba viên về vị trí của công thức, sau cùng trả lại như cũ.'
    case 'oll':
      return 'Có một cạnh bị lật ngược theo cách không thể xảy ra trên 3×3. Làm công thức lật cạnh — dài, nhưng chỉ cần một lần.'
    case 'pll':
      return 'Có hai cạnh bị đổi chỗ theo cách không thể xảy ra trên 3×3. Làm công thức đổi hai cạnh.'
    default:
      return null
  }
}

const LAYER_NAME: Record<string, Record<Face, string>> = {
  '': { U: 'Tầng trên', D: 'Tầng dưới', R: 'Mặt phải', L: 'Mặt trái', F: 'Mặt trước', B: 'Mặt sau' },
  w: {
    U: 'Hai tầng trên',
    D: 'Hai tầng dưới',
    R: 'Hai lớp phải',
    L: 'Hai lớp trái',
    F: 'Hai lớp trước',
    B: 'Hai lớp sau',
  },
  '2': {
    U: 'Tầng thứ hai từ trên',
    D: 'Tầng thứ hai từ dưới',
    R: 'Lớp trong bên phải',
    L: 'Lớp trong bên trái',
    F: 'Lớp trong phía trước',
    B: 'Lớp trong phía sau',
  },
}

const DIRECTION: Record<Face, [string, string]> = {
  R: ['đẩy lên', 'kéo xuống'],
  L: ['kéo xuống', 'đẩy lên'],
  U: ['xoay sang trái', 'xoay sang phải'],
  D: ['xoay sang phải', 'xoay sang trái'],
  F: ['theo chiều kim đồng hồ', 'ngược chiều kim đồng hồ'],
  B: [
    'ngược chiều kim đồng hồ khi nhìn từ phía trước',
    'theo chiều kim đồng hồ khi nhìn từ phía trước',
  ],
}

function describe4(move: string): string {
  if (/^[xyz]/.test(move)) return MOVE_DESC[move as keyof typeof MOVE_DESC]
  const half = move.endsWith('2') && move.length > 1 && !/^2[A-Z]$/.test(move)
  const prime = move.endsWith("'")
  const core = half || prime ? move.slice(0, -1) : move
  let kind = ''
  let face: Face
  if (core.startsWith('2')) {
    kind = '2'
    face = core[1] as Face
  } else {
    face = core[0] as Face
    if (core.endsWith('w')) kind = 'w'
  }
  const direction = half ? 'nửa vòng' : DIRECTION[face][prime ? 1 : 0]
  return `${LAYER_NAME[kind][face]} — ${direction}`
}

export const MOVE_DESC4: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    for (const prefix of ['', '2']) {
      for (const suffix of ['', "'", '2']) {
        const move = prefix ? `${prefix}${face}${suffix}` : `${face}${suffix}`
        out[move] = describe4(move)
      }
    }
    for (const suffix of ['', "'", '2']) out[`${face}w${suffix}`] = describe4(`${face}w${suffix}`)
  }
  for (const axis of ['x', 'y', 'z']) {
    for (const suffix of ['', "'", '2']) out[`${axis}${suffix}`] = describe4(`${axis}${suffix}`)
  }
  return out
})()
