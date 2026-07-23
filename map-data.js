/**
 * DỮ LIỆU SƠ ĐỒ - BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
 * Số 01 Trần Hưng Đạo, phường Hai Bà Trưng, Hà Nội
 * --------------------------------------------------------
 * Toạ độ x,y bên dưới được đo trên ảnh nền thật: assets/hospital-floorplan.jpg
 * (kích thước ảnh: 1000 x 1298 px). SVG sẽ vẽ đè lên đúng ảnh này bằng cách
 * dùng viewBox trùng kích thước ảnh, nên KHÔNG được đổi kích thước ảnh mà
 * không cập nhật lại MAP_IMAGE bên dưới.
 *
 * Toạ độ vẫn là ước lượng bằng mắt theo vị trí số hiệu (01-16) trên ảnh gốc.
 * Nếu cần chính xác hơn: mở file assets/hospital-floorplan.jpg bằng phần mềm
 * xem ảnh có thước đo pixel (hoặc Photoshop/GIMP), rê chuột vào đúng tâm mỗi
 * khu nhà để đọc toạ độ pixel thật, rồi sửa lại x,y tương ứng.
 *
 * Node = một điểm mốc. Có 3 loại:
 *   - Khu nhà / cổng (isDestination / isGate): nơi có thể là điểm bắt đầu (quét QR) hoặc đích đến.
 *   - Waypoint (isWaypoint): điểm gãy của lối đi thật (sân/đường trống), CHỈ dùng để dẫn đường
 *     cho đúng theo lối đi thực tế, không hiện trong danh sách chọn đích và không có trong QR.
 * Edge = một đoạn lối đi nối 2 mốc. Để đường đi không cắt xuyên qua nhà khác, mỗi khu nhà/cổng
 * chỉ nên nối tới waypoint gần nhất (không nối thẳng khu nhà này với khu nhà kia).
 * Trọng số (weight) của edge được TỰ TÍNH bằng khoảng cách toạ độ (xem app.js),
 * trừ khi bạn tự khai báo weight cụ thể để ép theo khoảng cách đo thực tế.
 */

// Ảnh nền mặt bằng thật + kích thước gốc (dùng làm viewBox cho SVG đè lên trên).
// Nội dung ảnh (base64) nằm trong map-image.js, được nạp TRƯỚC file này trong index.html.
const MAP_IMAGE = {
  src: MAP_BACKGROUND_DATA_URL,
  width: 1000,
  height: 1298,
};

const HOSPITAL_MAP = {
  nodes: [
    // ----- CỔNG RA VÀO (mốc quét QR khi vừa vào viện) -----
    { id: "G_1A", name: "Cổng 1A",         x: 520, y: 221, floor: 1, isGate: true },
    { id: "G_1B", name: "Cổng 1B",         x: 370, y: 234, floor: 1, isGate: true },
    { id: "G_CC", name: "Cổng Cấp cứu",    x: 100, y: 480, floor: 1, isGate: true },
    { id: "G_5",  name: "Cổng số 5",       x: 120, y: 1025, floor: 1, isGate: true },

    // ----- 16 KHU NHÀ (toạ độ đo theo ảnh 1000x1298) -----
    { id: "B01", name: "Nhà N1A",                              x: 300, y: 402,  floor: 1, isDestination: true },
    { id: "B02", name: "Nhà N1B",                              x: 420, y: 402,  floor: 1, isDestination: true },
    { id: "B03", name: "Nhà N2A",                              x: 360, y: 441,  floor: 1, isDestination: true },
    { id: "B04", name: "Nhà N2B",                              x: 420, y: 454,  floor: 1, isDestination: true },
    { id: "B05", name: "Trung tâm máy gia tốc",                x: 280, y: 454,  floor: 1, isDestination: true },
    { id: "B06", name: "Nhà N3",                                x: 480, y: 506,  floor: 1, isDestination: true },
    { id: "B07", name: "Trung tâm thẩm mỹ",                    x: 570, y: 415,  floor: 1, isDestination: true },
    { id: "B08", name: "Tòa Tháp đôi",                          x: 220, y: 675,  floor: 1, isDestination: true },
    { id: "B09", name: "Viện Bảo vệ, chăm sóc SK cán bộ TW",    x: 480, y: 649,  floor: 1, isDestination: true },
    { id: "B10", name: "Nhà Chỉ huy cơ quan",                   x: 490, y: 753,  floor: 1, isDestination: true },
    { id: "B11", name: "Viện Lâm sàng các bệnh truyền nhiễm",  x: 290, y: 870,  floor: 1, isDestination: true },
    { id: "B12", name: "Nhà để xe nhân viên",                   x: 160, y: 973,  floor: 1, isDestination: true },
    { id: "B13", name: "Nhà lưu trữ",                           x: 160, y: 844,  floor: 1, isDestination: true },
    { id: "B14", name: "Nhà thể thao đa năng (1)",              x: 610, y: 662,  floor: 1, isDestination: true },
    { id: "B15", name: "Nhà thể thao đa năng (2)",              x: 610, y: 740,  floor: 1, isDestination: true },
    { id: "B16", name: "Nhà tang lễ",                           x: 420, y: 1142, floor: 1, isDestination: true },

    // ----- ĐIỂM NÚT LỐI ĐI (waypoint) -----
    // Đây KHÔNG phải nơi đến, chỉ là điểm gãy của lối đi thật (sân/đường trống giữa các khu nhà),
    // để đường vẽ ra và lời chỉ dẫn đi theo đúng lối đi thực tế thay vì cắt thẳng qua nhà.
    { id: "P_N",   name: "Lối đi phía Bắc (gần cổng 1B)",        x: 230, y: 320, floor: 1, isWaypoint: true },
    { id: "P_NE",  name: "Lối đi phía Bắc (gần cổng 1A)",        x: 430, y: 320, floor: 1, isWaypoint: true },
    { id: "P_W1",  name: "Lối đi Tây 1 (gần cổng Cấp cứu)",      x: 230, y: 460, floor: 1, isWaypoint: true },
    { id: "P_C1",  name: "Lối đi Trung tâm 1",                    x: 400, y: 460, floor: 1, isWaypoint: true },
    { id: "P_E1",  name: "Lối đi Đông 1",                         x: 560, y: 460, floor: 1, isWaypoint: true },
    { id: "P_W2",  name: "Lối đi Tây 2 (cạnh Toà Tháp đôi)",      x: 200, y: 650, floor: 1, isWaypoint: true },
    { id: "P_C2",  name: "Lối đi Trung tâm 2 (sân vườn)",         x: 400, y: 620, floor: 1, isWaypoint: true },
    { id: "P_E2",  name: "Lối đi Đông 2",                         x: 580, y: 650, floor: 1, isWaypoint: true },
    { id: "P_C3",  name: "Lối đi Trung tâm 3",                    x: 430, y: 760, floor: 1, isWaypoint: true },
    { id: "P_E3",  name: "Lối đi Đông 3",                         x: 580, y: 750, floor: 1, isWaypoint: true },
    { id: "P_W3",  name: "Lối đi Tây 3 (gần Nhà lưu trữ)",        x: 200, y: 850, floor: 1, isWaypoint: true },
    { id: "P_S1",  name: "Lối đi Nam 1 (gần Viện Truyền nhiễm)",  x: 300, y: 950, floor: 1, isWaypoint: true },
    { id: "P_S2",  name: "Lối đi Nam 2 (hướng Nhà tang lễ)",      x: 400, y: 1050, floor: 1, isWaypoint: true },
  ],

  // Lối đi giữa các mốc - đi theo khoảng SÂN/ĐƯỜNG TRỐNG thực tế trên sơ đồ (qua các waypoint P_...),
  // KHÔNG nối thẳng building với building nữa để tránh cắt xuyên qua nhà khác.
  // Có thể chỉnh lại nếu thực tế lối đi khác (ví dụ có hàng rào, cầu nối riêng...).
  edges: [
    // khung xương lối đi chính (waypoint - waypoint)
    { from: "P_N",  to: "P_NE" },
    { from: "P_N",  to: "P_W1" },
    { from: "P_NE", to: "P_E1" },
    { from: "P_W1", to: "P_C1" },
    { from: "P_C1", to: "P_E1" },
    { from: "P_W1", to: "P_W2" },
    { from: "P_C1", to: "P_C2" },
    { from: "P_E1", to: "P_E2" },
    { from: "P_W2", to: "P_C2" },
    { from: "P_C2", to: "P_E2" },
    { from: "P_W2", to: "P_W3" },
    { from: "P_C2", to: "P_C3" },
    { from: "P_E2", to: "P_E3" },
    { from: "P_C3", to: "P_E3" },
    { from: "P_W3", to: "P_S1" },
    { from: "P_C3", to: "P_S1" },
    { from: "P_S1", to: "P_S2" },

    // cổng ra vào nối vào lối đi gần nhất
    { from: "G_1B", to: "P_N" },
    { from: "G_1A", to: "P_NE" },
    { from: "G_CC", to: "P_W1" },
    { from: "G_5",  to: "P_S1" },

    // khu nhà nối vào lối đi gần nhất (không nối thẳng nhà-với-nhà)
    { from: "B01", to: "P_N" },
    { from: "B05", to: "P_W1" },
    { from: "B03", to: "P_C1" },
    { from: "B04", to: "P_C1" },
    { from: "B02", to: "P_NE" },
    { from: "B07", to: "P_E1" },
    { from: "B06", to: "P_C1" },
    { from: "B08", to: "P_W2" },
    { from: "B09", to: "P_C2" },
    { from: "B14", to: "P_E2" },
    { from: "B10", to: "P_C3" },
    { from: "B15", to: "P_E3" },
    { from: "B13", to: "P_W3" },
    { from: "B11", to: "P_S1" },
    { from: "B12", to: "P_S1" },
    { from: "B16", to: "P_S2" },
  ],
};

/**
 * DANH MỤC KHOA/PHÒNG THEO TỪNG TẦNG CỦA MỖI KHU NHÀ
 * (lấy trực tiếp từ chú thích trong sơ đồ)
 * - buildingId phải khớp với id của node ở trên.
 * - floor: null nếu toà nhà không chia theo tầng cụ thể trong sơ đồ.
 */
const BUILDING_DIRECTORY = {
  B01: [
    { floor: 1, desc: "Đăng ký khám bệnh, Nhà thuốc số 2" },
    { floor: 2, desc: "Các phòng khám / Khoa C1.1-A" },
    { floor: 3, desc: "Khu vực lấy mẫu xét nghiệm / Khoa C1.1-B" },
    { floor: 4, desc: "Xquang, điện tim, siêu âm / Khoa C1.1-B" },
  ],
  B02: [
    { floor: 1, desc: "Xquang, cộng hưởng từ MRI / Khoa C1.1-A" },
    { floor: 2, desc: "Các phòng khám / Khoa C1.1-A" },
    { floor: 3, desc: "Các phòng khám / Khoa C1.1-B" },
    { floor: 4, desc: "Xquang, cộng hưởng từ MRI / Khoa C1.1-B" },
  ],
  B03: [
    { floor: 1, desc: "Cấp phát thuốc BHYT" },
    { floor: 2, desc: "Các phòng khám / Khoa C1.1-A" },
    { floor: 3, desc: "Các phòng khám / Khoa C1.1-B" },
    { floor: 4, desc: "Khu vực nội soi / Khoa C1.1-A" },
  ],
  B04: [
    { floor: 1, desc: "Khu vực nội soi / Khoa C1.1-A" },
  ],
  B05: [
    { floor: null, desc: "Trung tâm máy gia tốc" },
  ],
  B06: [
    { floor: 1, desc: "Xquang, điện tim, siêu âm / Khoa C1.1-A" },
    { floor: 2, desc: "Trung tâm khám sức khoẻ định kỳ" },
    { floor: 3, desc: "Các phòng khám / Khoa C1.1-B" },
    { floor: 4, desc: "Khoa điều trị theo yêu cầu" },
  ],
  B07: [
    { floor: null, desc: "Trung tâm thẩm mỹ" },
  ],
  B08: [
    { floor: null, desc: "Khoa Cấp cứu C1-3" },
    { floor: null, desc: "Khu khám A, B và Viettel" },
    { floor: null, desc: "Khối nhà điều trị Nội khoa" },
    { floor: null, desc: "Khối nhà điều trị Ngoại khoa" },
    { floor: null, desc: "Khối nhà Cận lâm sàng" },
  ],
  B09: [
    { floor: null, desc: "Viện Bảo vệ, chăm sóc sức khoẻ cán bộ Trung ương" },
  ],
  B10: [
    { floor: null, desc: "Ban Giám đốc" },
    { floor: null, desc: "Khối cơ quan" },
  ],
  B11: [
    { floor: 1, desc: "Khu khám bệnh truyền nhiễm" },
    { floor: 3, desc: "Khoa Hồi sức truyền nhiễm" },
    { floor: 4, desc: "Khoa Bệnh lây đường hô hấp" },
    { floor: 5, desc: "Khoa Bệnh lây đường tiêu hoá" },
    { floor: 6, desc: "Khoa Bệnh lây đường máu" },
  ],
  B12: [{ floor: null, desc: "Nhà để xe nhân viên" }],
  B13: [{ floor: null, desc: "Nhà lưu trữ" }],
  B14: [{ floor: null, desc: "Nhà thể thao đa năng" }],
  B15: [{ floor: null, desc: "Nhà thể thao đa năng" }],
  B16: [{ floor: null, desc: "Nhà tang lễ" }],
};
