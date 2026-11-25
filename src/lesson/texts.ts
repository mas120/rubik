import { COLOUR_NAME, pieceLabel } from '../colors'
import type { AlgId, Move, StageId, Step, ValidationError } from '../core'

export const STAGE_ORDER: readonly StageId[] = [
  'daisy',
  'cross',
  'firstLayerCorners',
  'middleEdges',
  'lastCross',
  'lastEdges',
  'lastCornersPosition',
  'lastCornersOrientation',
]

export const STAGE_TEXT: Record<StageId, { title: string; goal: string }> = {
  daisy: {
    title: 'Bông cúc',
    goal: 'Đưa 4 viên cạnh có màu trắng lên mặt trên, quây quanh tâm vàng, mặt trắng ngửa lên — trông như một bông cúc.',
  },
  cross: {
    title: 'Chữ thập trắng',
    goal: 'Đưa từng cánh hoa xuống mặt dưới sao cho màu bên của nó khớp với tâm của mặt bên.',
  },
  firstLayerCorners: {
    title: 'Góc tầng một',
    goal: 'Đặt 4 viên góc có màu trắng vào đáy để hoàn thành tầng một. Chỉ cần một công thức, lặp lại đến khi viên góc vào đúng chỗ.',
  },
  middleEdges: {
    title: 'Cạnh tầng giữa',
    goal: 'Đưa 4 viên cạnh không có màu vàng từ tầng trên xuống tầng giữa.',
  },
  lastCross: {
    title: 'Chữ thập vàng',
    goal: 'Tạo chữ thập vàng ở mặt trên. Chưa cần quan tâm màu bên của các cạnh.',
  },
  lastEdges: {
    title: 'Khớp cạnh vàng',
    goal: 'Làm cho màu bên của 4 cạnh tầng trên khớp với tâm các mặt bên.',
  },
  lastCornersPosition: {
    title: 'Đặt góc vàng',
    goal: 'Đưa 4 viên góc tầng trên về đúng vị trí: màu của viên góc trùng với ba tâm xung quanh, chưa cần đúng chiều.',
  },
  lastCornersOrientation: {
    title: 'Xoay góc vàng',
    goal: 'Xoay từng viên góc cho màu vàng ngửa lên. Quan trọng: trong giai đoạn này không xoay cả khối, chỉ xoay tầng trên để đưa viên góc tiếp theo về góc trên–phải–trước. Giữa chừng các tầng dưới trông như bị xáo trộn — đừng lo, chúng sẽ tự về chỗ khi xong viên góc cuối.',
  },
}

export const STAGE_ALGS: Record<StageId, AlgId[]> = {
  daisy: [],
  cross: [],
  firstLayerCorners: ['sexy'],
  middleEdges: ['insertRight', 'insertLeft'],
  lastCross: ['lastCross'],
  lastEdges: ['edgeSwap'],
  lastCornersPosition: ['cornerCycle'],
  lastCornersOrientation: ['cornerTwist'],
}

export const ALG_NAME: Record<AlgId, string> = {
  sexy: 'Công thức góc',
  insertRight: 'Chèn phải',
  insertLeft: 'Chèn trái',
  lastCross: 'Công thức chữ thập',
  edgeSwap: 'Đổi cạnh',
  cornerCycle: 'Xoay vòng góc',
  cornerTwist: 'Lật góc',
}

type CaseText = (piece: string, n: number) => string

export const CASE_TEXT: Record<string, CaseText> = {
  midRight: (p) =>
    `Viên cạnh ${p} đang ở tầng giữa, bên phải mặt trước, mặt trắng hướng về bạn. Xoay mặt phải lên để đưa nó vào bông cúc.`,
  midLeft: (p) =>
    `Viên cạnh ${p} đang ở tầng giữa, bên trái mặt trước, mặt trắng hướng về bạn. Xoay mặt trái lên để đưa nó vào bông cúc.`,
  topFlipped: (p) =>
    `Viên cạnh ${p} đã ở tầng trên nhưng mặt trắng hướng về bạn thay vì ngửa lên. Xoay mặt trước để đưa nó xuống tầng giữa; bước sau sẽ đưa nó lên lại cho đúng chiều.`,
  bottomSide: (p) =>
    `Viên cạnh ${p} ở tầng dưới, mặt trắng hướng về bạn. Xoay mặt trước để đưa nó lên tầng giữa; bước sau sẽ đưa nó vào bông cúc.`,
  bottomDown: (p) =>
    `Viên cạnh ${p} ở tầng dưới, mặt trắng úp xuống. Xoay mặt trước nửa vòng để lật nó lên trên.`,
  petalDown: (p) =>
    `Xoay tầng trên đến khi màu bên của viên ${p} trùng với tâm ngay bên dưới, rồi xoay mặt đó nửa vòng để đưa viên này xuống đáy.`,
  cornerTop: (p, n) =>
    `Viên góc ${p} đang ở tầng trên. Đưa nó về góc trên–phải–trước, ngay phía trên vị trí của nó, rồi làm công thức ${n} lần.`,
  cornerTwisted: (p, n) =>
    `Viên góc ${p} đã ở đúng vị trí nhưng xoay sai chiều. Làm công thức ${n} lần để xoay nó lại.`,
  cornerWrongSlot: (p) =>
    `Viên góc ${p} đang nằm ở đáy nhưng sai vị trí. Làm công thức 1 lần để đưa nó lên tầng trên; bước sau sẽ đặt lại.`,
  insertRight: (p) =>
    `Viên cạnh ${p} ở tầng trên, màu mặt trước đã khớp với tâm. Màu ngửa lên trùng với tâm bên phải, nên chèn nó sang phải.`,
  insertLeft: (p) =>
    `Viên cạnh ${p} ở tầng trên, màu mặt trước đã khớp với tâm. Màu ngửa lên trùng với tâm bên trái, nên chèn nó sang trái.`,
  ejectMiddle: (p) =>
    `Viên cạnh ${p} đang nằm ở tầng giữa nhưng sai chỗ hoặc lật ngược. Dùng công thức chèn phải để đẩy nó lên tầng trên; bước sau sẽ chèn lại.`,
  dot: () => 'Mặt trên chưa có cạnh vàng nào ngửa lên, chỉ có chấm giữa. Làm công thức một lần.',
  lShape: () =>
    'Hai cạnh vàng tạo thành chữ L. Xoay tầng trên để chữ L nằm ở góc sau–trái, rồi làm công thức.',
  line: () =>
    'Hai cạnh vàng tạo thành đường thẳng. Xoay tầng trên để đường thẳng nằm ngang, rồi làm công thức.',
  adjacent: () =>
    'Có hai cạnh kề nhau đã khớp. Cầm khối sao cho hai cạnh đó ở phía sau và bên phải, rồi làm công thức.',
  opposite: () =>
    'Hai cạnh đã khớp nằm đối diện nhau. Làm công thức một lần; sau đó sẽ gặp trường hợp hai cạnh kề nhau.',
  align: () => 'Xoay tầng trên để các cạnh khớp với tâm.',
  onePlaced: (_, n) =>
    `Có một viên góc đã ở đúng vị trí. Cầm khối để nó ở góc trên–phải–trước, rồi làm công thức ${n} lần.`,
  nonePlaced: () =>
    'Chưa có viên góc nào đúng vị trí. Làm công thức một lần; sau đó sẽ có một viên đúng.',
  twist: (p, n) =>
    `Viên góc ${p} ở góc trên–phải–trước chưa ngửa vàng lên. Làm công thức ${n} lần.`,
  finalAlign: () => 'Xoay tầng trên để hoàn thành!',
}

export function explainStep(step: Step): string | null {
  const text = CASE_TEXT[step.caseId]
  if (!text) return null
  return text(step.piece ? pieceLabel(step.piece) : '', step.repeat)
}

const FACE_NAME = { R: 'Mặt phải', L: 'Mặt trái', U: 'Tầng trên', D: 'Tầng dưới', F: 'Mặt trước', B: 'Mặt sau' }

export const MOVE_DESC: Record<Move, string> = {
  R: 'Mặt phải — đẩy lên',
  "R'": 'Mặt phải — kéo xuống',
  R2: `${FACE_NAME.R} — nửa vòng`,
  L: 'Mặt trái — kéo xuống',
  "L'": 'Mặt trái — đẩy lên',
  L2: `${FACE_NAME.L} — nửa vòng`,
  U: 'Tầng trên — xoay sang trái',
  "U'": 'Tầng trên — xoay sang phải',
  U2: `${FACE_NAME.U} — nửa vòng`,
  D: 'Tầng dưới — xoay sang phải',
  "D'": 'Tầng dưới — xoay sang trái',
  D2: `${FACE_NAME.D} — nửa vòng`,
  F: 'Mặt trước — theo chiều kim đồng hồ',
  "F'": 'Mặt trước — ngược chiều kim đồng hồ',
  F2: `${FACE_NAME.F} — nửa vòng`,
  B: 'Mặt sau — ngược chiều kim đồng hồ khi nhìn từ phía trước',
  "B'": 'Mặt sau — theo chiều kim đồng hồ khi nhìn từ phía trước',
  B2: `${FACE_NAME.B} — nửa vòng`,
  y: 'Xoay cả khối — mặt bên phải quay về phía bạn',
  "y'": 'Xoay cả khối — mặt bên trái quay về phía bạn',
  y2: 'Xoay cả khối — nửa vòng',
  M: 'Lớp giữa dọc — kéo xuống',
  "M'": 'Lớp giữa dọc — đẩy lên',
  M2: 'Lớp giữa dọc — nửa vòng',
  E: 'Lớp giữa ngang — xoay sang phải',
  "E'": 'Lớp giữa ngang — xoay sang trái',
  E2: 'Lớp giữa ngang — nửa vòng',
  S: 'Lớp giữa đứng — theo chiều kim đồng hồ',
  "S'": 'Lớp giữa đứng — ngược chiều kim đồng hồ',
  S2: 'Lớp giữa đứng — nửa vòng',
  x: 'Xoay cả khối — lật ra phía sau',
  "x'": 'Xoay cả khối — lật về phía bạn',
  x2: 'Xoay cả khối — lật nửa vòng',
  z: 'Xoay cả khối — nghiêng sang phải',
  "z'": 'Xoay cả khối — nghiêng sang trái',
  z2: 'Xoay cả khối — nghiêng nửa vòng',
}

export function validationMessage(error: ValidationError): string {
  switch (error.kind) {
    case 'colourCount':
      return `Màu ${COLOUR_NAME[error.colour]} đang có ${error.count} ô, cần đúng 9 ô.`
    case 'pieces':
      return 'Có viên cạnh hoặc viên góc mang tổ hợp màu không tồn tại. Kiểm tra lại các ô đã nhập.'
    case 'edgeFlip':
      return 'Có một viên cạnh bị lật ngược. Thường do nhập nhầm hai ô của một viên cạnh, hoặc khối đã bị tháo lắp.'
    case 'cornerTwist':
      return 'Có một viên góc bị xoay sai. Kiểm tra lại các ô ở góc.'
    case 'parity':
      return 'Có hai viên đang bị đổi chỗ cho nhau. Kiểm tra lại các ô đã nhập.'
    case 'centres':
      return 'Sáu ô tâm phải có sáu màu khác nhau.'
  }
}

export const SETUP_HINT = 'Trước hết xoay khối hoặc tầng trên như dưới đây để đưa về đúng tư thế.'
