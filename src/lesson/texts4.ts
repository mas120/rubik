import { COLOUR_NAME } from '../colors'
import type { Face, ValidationError4 } from '../core'
import { MOVE_DESC } from './texts'

export const STAGES4 = ['centres', 'edges', 'parityOll', 'parityPll'] as const

export const STAGE_ALGS4: Record<(typeof STAGES4)[number], string[]> = {
  centres: [],
  edges: ['pairLast'],
  parityOll: ['ollParity'],
  parityPll: ['pllParity'],
}

export const STAGE_TEXT4: Record<(typeof STAGES4)[number], { title: string; goal: string }> = {
  centres: {
    title: 'Ghép tâm',
    goal: 'Khối 4×4 không có ô tâm cố định: mỗi mặt có 4 ô tâm và chúng di chuyển được. Việc đầu tiên là gom 4 ô tâm cùng màu về một mặt. Làm theo thứ tự: trắng trước, rồi vàng ở mặt đối diện, rồi đỏ, xanh dương, cam; mặt xanh lá còn lại sẽ tự xong. Cách làm luôn giống nhau: đưa ô tâm vào chỗ, rồi trả lớp vừa xoay về chỗ cũ để không phá các tâm đã xong.',
  },
  edges: {
    title: 'Ghép cặp cạnh',
    goal: 'Mỗi cạnh của khối 4×4 gồm hai viên cạnh nhỏ. Tìm hai viên cùng màu, đưa chúng về hàng dưới, nằm thẳng hàng ở hai bên mặt trước, rồi làm một công thức duy nhất để ghép chúng thành một cặp. Lặp lại cho đủ 12 cặp. Các tâm đã xong sẽ không bị phá.',
  },
  parityOll: {
    title: 'Trường hợp đặc biệt 1',
    goal: 'Khối 4×4 có hai trường hợp đặc biệt không bao giờ gặp ở khối 3×3. Đây là trường hợp thứ nhất: khi chuẩn bị làm chữ thập vàng, số cạnh vàng ngửa lên là số lẻ (1 hoặc 3). Sửa bằng một công thức dài — cứ làm chậm từng nước theo mũi tên, chỉ cần làm một lần.',
  },
  parityPll: {
    title: 'Trường hợp đặc biệt 2',
    goal: 'Đây là trường hợp đặc biệt thứ hai của khối 4×4: có hai cạnh ở tầng trên bị đổi chỗ cho nhau, nếu cứ giải tiếp như khối 3×3 thì sẽ không bao giờ xong. Sửa bằng một công thức ngắn, chỉ gồm các nước xoay nửa vòng.',
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
  pairLast: 'Ghép cạnh',
  wingCycle3: 'Đổi ba viên cạnh',
  ollParity: 'Lật cạnh (đặc biệt 1)',
  pllParity: 'Đổi hai cạnh (đặc biệt 2)',
}

export function explain4(caseId: string, target: Face | null): string | null {
  const colour = target ? COLOUR_NAME[target] : ''
  switch (caseId) {
    case 'centreD':
      return 'Đưa thêm ô tâm trắng (đang sáng) về mặt dưới, rồi trả lớp vừa xoay về chỗ cũ.'
    case 'centreU':
      return 'Đưa thêm ô tâm vàng (đang sáng) lên mặt trên, đối diện mặt trắng, rồi trả lớp vừa xoay về để tâm trắng không bị phá.'
    case 'centreSides':
      return `Đưa thêm ô tâm ${colour} (đang sáng) về đúng mặt của nó, rồi trả lớp vừa xoay về để các tâm đã xong không bị phá.`
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
      return 'Hai viên cạnh cùng màu (đang sáng) được đưa về hàng dưới, thẳng hàng ở hai bên mặt trước. Làm công thức ghép cạnh: hai tầng dưới xoay để hai viên gặp nhau, cặp vừa ghép nằm ở cạnh đứng bên phải mặt trước, rồi hai tầng dưới trả về để giữ nguyên các tâm.'
    case 'edgeCycle':
      return 'Dùng công thức đổi chỗ ba viên cạnh để ghép cặp còn lại. Các nước chuẩn bị đưa ba viên về vị trí của công thức, sau cùng trả lại như cũ.'
    case 'oll':
      return 'Số cạnh vàng ngửa lên đang là số lẻ. Làm công thức dài này một lần để lật cặp cạnh phía trước của tầng trên; sau đó làm chữ thập vàng như bình thường.'
    case 'pll':
      return 'Làm công thức này để đổi chỗ cặp cạnh phía trước với cặp cạnh phía sau của tầng trên (tầng trên cũng bị xoay nửa vòng theo, không sao); sau đó giải tiếp như khối 3×3.'
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

export const FACE_NAME4: Record<Face, string> = {
  F: 'mặt trước',
  R: 'mặt phải',
  B: 'mặt sau',
  L: 'mặt trái',
  U: 'mặt trên',
  D: 'mặt dưới',
}

export const INSTRUCTIONS4: Record<Face, string> = {
  F: 'Chọn một mặt làm mặt trước và giữ nguyên cách cầm đó. Nhập mặt đang hướng về bạn.',
  R: 'Giữ mặt trên ở trên, xoay khối để mặt bên phải hướng về bạn.',
  B: 'Giữ mặt trên ở trên, xoay tiếp để mặt sau hướng về bạn.',
  L: 'Giữ mặt trên ở trên, xoay tiếp để mặt bên trái hướng về bạn.',
  U: 'Quay về tư thế ban đầu, rồi nghiêng khối về phía bạn để nhìn thẳng vào mặt trên — mặt trước nằm phía dưới.',
  D: 'Từ tư thế ban đầu, ngửa khối ra sau để nhìn thẳng vào mặt dưới — mặt trước nằm phía trên.',
}

export function validationMessage4(error: ValidationError4): string {
  switch (error.kind) {
    case 'colourCount':
      return `Màu ${COLOUR_NAME[error.colour]} đang có ${error.count} ô, cần đúng 16 ô.`
    case 'corners':
      return 'Có viên góc mang tổ hợp màu không tồn tại. Kiểm tra lại các ô ở góc.'
    case 'cornerTwist':
      return 'Có một viên góc bị xoay sai. Kiểm tra lại các ô ở góc.'
    case 'wings':
      return 'Có viên cạnh mang tổ hợp màu không tồn tại hoặc bị nhập trùng. Kiểm tra lại các ô ở cạnh.'
  }
}
