const PATTERN = /^(2?)([UDRLFBMESxyz])(w?)(['2]?)$/

const ROTATION: Record<string, string> = {
  x: 'lật khối ra phía sau (mặt trước thành mặt trên)',
  "x'": 'lật khối về phía bạn (mặt trên thành mặt trước)',
  x2: 'lật khối nửa vòng (mặt trên thành mặt dưới)',
  y: 'xoay khối sang trái (mặt bên phải quay về phía bạn)',
  "y'": 'xoay khối sang phải (mặt bên trái quay về phía bạn)',
  y2: 'xoay khối nửa vòng (mặt sau quay về phía bạn)',
  z: 'nghiêng khối sang phải (mặt trên thành mặt phải)',
  "z'": 'nghiêng khối sang trái (mặt trên thành mặt trái)',
  z2: 'nghiêng khối nửa vòng (mặt trên thành mặt dưới)',
}

const PLAIN: Record<string, string> = {
  U: 'tầng trên cùng',
  D: 'tầng dưới cùng',
  R: 'mặt bên phải',
  L: 'mặt bên trái',
  F: 'mặt trước (mặt đang hướng về bạn)',
  B: 'mặt sau (mặt khuất phía sau)',
  M: 'lớp giữa dọc (nằm giữa mặt trái và mặt phải)',
  E: 'lớp giữa ngang (nằm giữa tầng trên và tầng dưới)',
  S: 'lớp giữa đứng (nằm giữa mặt trước và mặt sau)',
}

const WIDE: Record<string, string> = {
  U: 'hai tầng trên cùng lúc',
  D: 'hai tầng dưới cùng lúc',
  R: 'hai lớp bên phải cùng lúc',
  L: 'hai lớp bên trái cùng lúc',
  F: 'hai lớp phía trước cùng lúc',
  B: 'hai lớp phía sau cùng lúc',
}

const INNER: Record<string, string> = {
  U: 'tầng thứ hai tính từ trên xuống (tầng trên cùng đứng yên)',
  D: 'tầng thứ hai tính từ dưới lên (tầng dưới cùng đứng yên)',
  R: 'lớp thứ hai tính từ bên phải (mặt phải ngoài cùng đứng yên)',
  L: 'lớp thứ hai tính từ bên trái (mặt trái ngoài cùng đứng yên)',
  F: 'lớp thứ hai tính từ phía trước (mặt trước đứng yên)',
  B: 'lớp thứ hai tính từ phía sau (mặt sau đứng yên)',
}

const FORWARD_UP: [string, string] = ['đẩy phần phía trước đi lên', 'kéo phần phía trước đi xuống']
const FORWARD_DOWN: [string, string] = ['kéo phần phía trước đi xuống', 'đẩy phần phía trước đi lên']
const FORWARD_LEFT: [string, string] = ['đưa phần phía trước sang trái', 'đưa phần phía trước sang phải']
const FORWARD_RIGHT: [string, string] = ['đưa phần phía trước sang phải', 'đưa phần phía trước sang trái']
const CLOCKWISE: [string, string] = ['theo chiều kim đồng hồ', 'ngược chiều kim đồng hồ']

const DIRECTION: Record<string, [string, string]> = {
  R: FORWARD_UP,
  L: FORWARD_DOWN,
  M: FORWARD_DOWN,
  U: FORWARD_LEFT,
  D: FORWARD_RIGHT,
  E: FORWARD_RIGHT,
  F: CLOCKWISE,
  S: CLOCKWISE,
  B: ['ngược chiều kim đồng hồ nếu nhìn từ phía trước', 'theo chiều kim đồng hồ nếu nhìn từ phía trước'],
}

export function moveInstruction(move: string): string {
  const match = PATTERN.exec(move)
  if (!match) throw new Error(`Unknown move ${move}`)
  const [, inner, letter, wide, suffix] = match
  if (/[xyz]/.test(letter)) {
    if (inner || wide) throw new Error(`Unknown move ${move}`)
    return `Cầm cả khối và ${ROTATION[`${letter}${suffix}`]}, không xoay riêng lớp nào.`
  }
  const table = inner ? INNER : wide ? WIDE : PLAIN
  const where = table[letter]
  if (!where || (inner && wide)) throw new Error(`Unknown move ${move}`)
  const amount =
    suffix === '2'
      ? 'nửa vòng (180°), theo chiều nào cũng được'
      : `một phần tư vòng (90°), ${DIRECTION[letter][suffix === "'" ? 1 : 0]}`
  return `Xoay ${where} ${amount}.`
}

export function notationLegend(n: 3 | 4): string[] {
  const wide =
    n === 4
      ? [
          'Có chữ w (ví dụ Rw): xoay hai lớp cùng lúc — mặt ngoài và lớp ngay bên trong nó.',
          'Có số 2 phía trước (ví dụ 2R): chỉ xoay lớp bên trong, mặt ngoài đứng yên.',
        ]
      : []
  return [
    'Mỗi ô chữ là một nước xoay. Ô màu xanh là nước đang làm, ô mờ là nước đã xong.',
    'Chữ cái cho biết xoay mặt nào: U = trên, D = dưới, R = phải, L = trái, F = trước (hướng về bạn), B = sau.',
    'Chỉ có chữ cái (ví dụ R): xoay một phần tư vòng theo chiều kim đồng hồ khi nhìn thẳng vào mặt đó.',
    "Có dấu ' (ví dụ R'): xoay một phần tư vòng ngược chiều kim đồng hồ.",
    'Có số 2 phía sau (ví dụ R2): xoay nửa vòng.',
    ...wide,
    'x, y, z: cầm cả khối xoay, không xoay riêng lớp nào.',
    'Ô tâm là ô ở giữa mặt; viên cạnh là viên có 2 màu; viên góc là viên có 3 màu.',
    'Không cần thuộc ký hiệu: dòng chữ to và mũi tên trên khối luôn cho biết phải xoay thế nào.',
  ]
}

export const PHASE_LABEL = {
  setup: 'Chuẩn bị — đưa khối về đúng tư thế trước',
  alg: 'các nước xoay chính',
  cleanup: 'Trả lại — đưa các phần đã xong về chỗ cũ',
} as const

export const HIGHLIGHT_HINT = 'Những ô được nhắc tới đang được làm nổi bật trên khối.'
