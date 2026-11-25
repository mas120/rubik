export type BasicsBlock = { p: string } | { ul: string[] } | { demo: string[] }

export interface BasicsPage {
  title: string
  blocks: BasicsBlock[]
}

const DEMO3 = ['R', "R'", 'R2', 'U', "U'", 'F', "F'", 'L', 'D', 'B']
const DEMO4 = [...DEMO3, 'Rw', "Rw'", '2R', 'Uw']

const STAGE_BULLETS = [
  'Bông cúc: đưa 4 viên cạnh trắng lên quanh tâm vàng.',
  'Chữ thập trắng: đưa 4 viên cạnh đó xuống mặt dưới cho khớp màu.',
  'Góc tầng một: đặt 4 viên góc trắng, xong tầng dưới cùng.',
  'Cạnh tầng giữa: đặt 4 viên cạnh của tầng giữa.',
  'Chữ thập vàng: tạo chữ thập vàng ở mặt trên.',
  'Khớp cạnh vàng: xoay các cạnh tầng trên cho khớp màu mặt bên.',
  'Đặt góc vàng: đưa 4 viên góc tầng trên về đúng vị trí.',
  'Xoay góc vàng: xoay từng viên góc cho màu vàng ngửa lên — xong!',
]

const VIEW_BULLET =
  'Để đổi góc nhìn, kéo ngón tay (hoặc chuột) ở vùng trống quanh khối — kéo ngay trên khối sẽ xoay một lớp; bấm Đặt lại góc nhìn để về như cũ.'

export function basicsPages(n: 3 | 4): BasicsPage[] {
  const is4 = n === 4
  return [
    {
      title: 'Làm quen với khối Rubik',
      blocks: [
        {
          p: 'Khối Rubik có 6 mặt. Khi giải xong, mỗi mặt chỉ có một màu: trắng, vàng, đỏ, cam, xanh lá, xanh dương.',
        },
        {
          p: 'Khối không gồm các ô màu rời nhau mà gồm các viên nhỏ. Mỗi viên có 1, 2 hoặc 3 ô màu dính liền, và các ô trên cùng một viên luôn đi cùng nhau.',
        },
        {
          ul: is4
            ? [
                'Ô tâm: mỗi mặt có 4 ô tâm ở giữa. Khác với khối 3×3, chúng di chuyển được, nên bạn phải tự gom 4 ô cùng màu lại với nhau.',
                'Viên cạnh: có 2 màu. Mỗi cạnh của khối gồm 2 viên cạnh nằm sát nhau, tổng cộng 24 viên.',
                'Viên góc: nằm ở góc, có 3 màu. Có 8 viên.',
              ]
            : [
                'Ô tâm: nằm chính giữa mỗi mặt, chỉ có 1 màu. Các tâm không bao giờ đổi chỗ cho nhau, nên tâm màu gì thì mặt đó khi giải xong sẽ có màu đó.',
                'Viên cạnh: nằm giữa hai góc, có 2 màu. Có 12 viên.',
                'Viên góc: nằm ở góc, có 3 màu. Có 8 viên.',
              ],
        },
        { p: 'Giải Rubik là đưa từng viên về đúng chỗ của nó, chứ không phải làm xong từng mặt một.' },
      ],
    },
    {
      title: 'Cách cầm khối và tên các mặt',
      blocks: [
        {
          p: 'Hãy cầm khối thật giống hệt khối trên màn hình: mặt nào ở trên, mặt nào hướng về bạn phải trùng nhau.',
        },
        ...(is4 ? [] : [{ p: 'Với khối 3×3, bài học bắt đầu với tâm vàng ở trên và tâm xanh lá hướng về bạn.' }]),
        { p: 'Các mặt được gọi tên theo vị trí so với bạn, không theo màu:' },
        {
          ul: [
            'Mặt trên (viết tắt U) và mặt dưới (D).',
            'Mặt trái (L) và mặt phải (R).',
            'Mặt trước (F) là mặt hướng về bạn; mặt sau (B) là mặt khuất phía sau.',
          ],
        },
        {
          p: 'Nếu bạn xoay cả khối thì mặt trước sẽ thành mặt khác. Vì vậy đừng tự xoay cả khối khi app không yêu cầu.',
        },
      ],
    },
    {
      title: 'Nước xoay và ký hiệu',
      blocks: [
        {
          p: 'Mỗi lần xoay một mặt hoặc một lớp của khối gọi là một nước. Nước cơ bản là xoay một phần tư vòng, tức 90°.',
        },
        { p: 'Mỗi nước được viết tắt bằng một ký hiệu:' },
        {
          ul: [
            'Chữ cái là mặt cần xoay: U = trên, D = dưới, L = trái, R = phải, F = trước, B = sau.',
            'Chỉ có chữ cái (R): xoay 90° theo chiều kim đồng hồ, tính khi bạn nhìn thẳng vào mặt đó.',
            "Thêm dấu ' (R'): xoay 90° theo chiều ngược lại.",
            'Thêm số 2 phía sau (R2): xoay nửa vòng, tức 180°.',
            ...(is4
              ? [
                  'Thêm chữ w (Rw): xoay hai lớp cùng lúc — mặt ngoài và lớp ngay bên trong nó.',
                  'Số 2 đứng trước (2R): chỉ xoay lớp bên trong, mặt ngoài đứng yên.',
                ]
              : []),
            'x, y, z: cầm cả khối xoay, không xoay riêng lớp nào.',
          ],
        },
        {
          p: 'Bấm thử các ký hiệu bên dưới để xem khối xoay thế nào. Bạn không cần học thuộc: trong bài học, app luôn vẽ mũi tên và ghi rõ bằng lời.',
        },
        { demo: is4 ? DEMO4 : DEMO3 },
      ],
    },
    {
      title: 'Công thức là gì',
      blocks: [
        {
          p: "Công thức là một chuỗi nước xoay làm liên tiếp theo đúng thứ tự, ví dụ R U R' U'. Mỗi công thức làm một việc cụ thể, chẳng hạn đưa một viên góc vào chỗ mà không làm hỏng phần đã xong.",
        },
        { p: 'Trong bài học, mỗi bước có thể gồm ba phần:' },
        {
          ul: [
            'Chuẩn bị: vài nước xoay để đưa viên cần xử lý về đúng vị trí trước khi làm công thức.',
            'Công thức: các nước xoay chính.',
            'Trả lại: vài nước xoay để đưa những phần đã xong về chỗ cũ.',
          ],
        },
        {
          p: 'Giữa chừng một công thức, khối có thể trông rối hơn lúc đầu. Điều đó bình thường — cứ làm hết công thức thì các phần đã xong sẽ trở lại.',
        },
      ],
    },
    {
      title: 'Cách giải: từng bước một',
      blocks: [
        ...(is4
          ? [
              { p: 'Khối 4×4 được giải bằng cách biến nó thành một khối 3×3 lớn, qua 2 giai đoạn:' },
              {
                ul: [
                  'Ghép tâm: gom 4 ô tâm cùng màu về một mặt, lần lượt trắng, vàng, đỏ, xanh dương, cam.',
                  'Ghép cặp cạnh: ghép hai viên cạnh cùng màu thành một cặp, đủ 12 cặp.',
                ],
              },
              { p: 'Sau đó giải tiếp y như khối 3×3, từng tầng từ dưới lên, qua 8 giai đoạn:' },
            ]
          : [{ p: 'App dạy cách giải dễ nhất cho người mới: giải từng tầng từ dưới lên, qua 8 giai đoạn:' }]),
        { ul: STAGE_BULLETS },
        ...(is4
          ? [
              {
                p: 'Khối 4×4 có thể gặp hai trường hợp đặc biệt không có ở khối 3×3: một lần khi làm chữ thập vàng và một lần ngay sau đó. Khi gặp, app sẽ báo và đưa công thức để sửa.',
              },
            ]
          : []),
        { p: 'Mỗi giai đoạn chỉ cần một hoặc hai công thức ngắn, và app sẽ nhắc lại mỗi lần cần dùng.' },
      ],
    },
    {
      title: 'Cách dùng bài học',
      blocks: [
        { p: 'Trong bài học, màn hình có khối 3D ở trên và khung hướng dẫn ở dưới.' },
        {
          ul: [
            'Những ô cần chú ý được làm nổi bật trên khối.',
            'Mũi tên trên khối chỉ nước xoay tiếp theo.',
            'Dòng chữ to trong khung hướng dẫn mô tả nước đó bằng lời.',
            'Bấm Tiếp để app xoay giúp, rồi bạn xoay theo trên khối thật. Hoặc tự kéo trên khối theo mũi tên.',
            'Bấm Lùi để quay lại một nước, Xem lại để xem lại nước đang làm.',
            VIEW_BULLET,
          ],
        },
        {
          p: 'Hãy xoay khối thật của bạn giống hệt từng nước trên màn hình. Nếu lỡ xoay sai trên khối thật, xoay ngược lại nước đó rồi làm tiếp.',
        },
        {
          p: 'Bài đang học được lưu lại: bạn có thể thoát ra rồi bấm Tiếp tục bài đang học bất cứ lúc nào.',
        },
      ],
    },
  ]
}
