import { COLOUR_NAME } from '../colors'
import type { Face } from '../core'

export const SCAN_HOLD: Record<Face, string> = {
  F: 'Hướng mặt có tâm xanh lá vào camera, tâm vàng ở phía trên.',
  R: 'Giữ tâm vàng ở phía trên, xoay khối sang ngang để mặt có tâm cam hướng vào camera.',
  B: 'Giữ tâm vàng ở phía trên, xoay tiếp để mặt có tâm xanh dương hướng vào camera.',
  L: 'Giữ tâm vàng ở phía trên, xoay tiếp để mặt có tâm đỏ hướng vào camera.',
  U: 'Hướng mặt có tâm vàng vào camera, sao cho mặt xanh dương ở phía trên và mặt xanh lá ở phía dưới.',
  D: 'Hướng mặt có tâm trắng vào camera, sao cho mặt xanh lá ở phía trên và mặt xanh dương ở phía dưới.',
}

export const SCAN_HOLD4: Record<Face, string> = {
  F: 'Chọn một mặt làm mặt trước và nhớ mặt nào đang ở trên. Hướng mặt trước vào camera, giữ mặt trên ở phía trên.',
  R: 'Giữ mặt trên ở phía trên, xoay khối sang ngang để mặt bên phải hướng vào camera.',
  B: 'Giữ mặt trên ở phía trên, xoay tiếp để mặt sau hướng vào camera.',
  L: 'Giữ mặt trên ở phía trên, xoay tiếp để mặt bên trái hướng vào camera.',
  U: 'Quay về tư thế ban đầu, rồi hướng mặt trên vào camera, sao cho mặt sau ở phía trên và mặt trước ở phía dưới.',
  D: 'Quay về tư thế ban đầu, rồi hướng mặt dưới vào camera, sao cho mặt trước ở phía trên và mặt sau ở phía dưới.',
}

export function scanSteps(n: 3 | 4, hold: string): string[] {
  return [
    hold,
    'Đưa khối lại gần camera (khoảng 15–20 cm), giữ thẳng, không nghiêng.',
    `Canh sao cho ${n * n} ô của mặt khối nằm gọn trong ${n * n} ô của khung.`,
    'Khi chấm tròn trong mỗi ô hiện đúng màu thật của ô đó thì bấm Chụp.',
  ]
}

export function centreWarning(seen: Face, expected: Face): string {
  return `Ô giữa đang được nhận là màu ${COLOUR_NAME[seen]}, nhưng mặt này phải có tâm ${COLOUR_NAME[expected]}. Hãy kiểm tra lại cách cầm khối.`
}
