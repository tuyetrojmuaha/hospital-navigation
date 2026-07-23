/**
 * DỮ LIỆU SƠ ĐỒ - BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
 * Số 01 Trần Hưng Đạo, phường Hai Bà Trưng, Hà Nội
 * --------------------------------------------------------
 * QUAN TRỌNG: toạ độ x,y bên dưới là ƯỚC LƯỢNG từ ảnh sơ đồ tổng thể,
 * CHƯA phải số đo chính xác. Trước khi triển khai thật, nên:
 *   1. Lấy file CAD/bản vẽ mặt bằng gốc (nếu có) để đo toạ độ chuẩn hơn, HOẶC
 *   2. Đi thực địa, đo khoảng cách/góc giữa các khu nhà rồi quy đổi sang x,y.
 * Việc này chỉ ảnh hưởng đến ĐỘ CHÍNH XÁC của hình vẽ & lời chỉ dẫn rẽ trái/phải,
 * không ảnh hưởng đến việc tìm đúng khu nhà/khoa cần đến.
 *
 * Node = một điểm mốc (cổng, hoặc khu nhà) -> cũng là nội dung mã QR dán tại đó.
 * Edge = một đoạn lối đi nối 2 mốc (không cần vẽ chi tiết từng ngã rẽ nhỏ).
 * Trọng số (weight) của edge được TỰ TÍNH bằng khoảng cách toạ độ (xem app.js),
 * trừ khi bạn tự khai báo weight cụ thể để ép theo khoảng cách đo thực tế.
 */

const HOSPITAL_MAP = {
  nodes: [
    // ----- CỔNG RA VÀO (mốc quét QR khi vừa vào viện) -----
    { id: "G_1A", name: "Cổng 1A",         x: 312, y: 136, floor: 1, isGate: true },
    { id: "G_1B", name: "Cổng 1B",         x: 222, y: 144, floor: 1, isGate: true },
    { id: "G_CC", name: "Cổng Cấp cứu",    x: 60,  y: 296, floor: 1, isGate: true },
    { id: "G_5",  name: "Cổng số 5",       x: 72,  y: 632, floor: 1, isGate: true },

    // ----- 16 KHU NHÀ (toạ độ ước lượng theo sơ đồ) -----
    { id: "B01", name: "Nhà N1A",                              x: 180, y: 248, floor: 1, isDestination: true },
    { id: "B02", name: "Nhà N1B",                              x: 252, y: 248, floor: 1, isDestination: true },
    { id: "B03", name: "Nhà N2A",                              x: 216, y: 272, floor: 1, isDestination: true },
    { id: "B04", name: "Nhà N2B",                              x: 252, y: 280, floor: 1, isDestination: true },
    { id: "B05", name: "Trung tâm máy gia tốc",                x: 168, y: 280, floor: 1, isDestination: true },
    { id: "B06", name: "Nhà N3",                                x: 288, y: 312, floor: 1, isDestination: true },
    { id: "B07", name: "Trung tâm thẩm mỹ",                    x: 342, y: 256, floor: 1, isDestination: true },
    { id: "B08", name: "Tòa Tháp đôi",                          x: 132, y: 416, floor: 1, isDestination: true },
    { id: "B09", name: "Viện Bảo vệ, chăm sóc SK cán bộ TW",    x: 288, y: 400, floor: 1, isDestination: true },
    { id: "B10", name: "Nhà Chỉ huy cơ quan",                   x: 294, y: 464, floor: 1, isDestination: true },
    { id: "B11", name: "Viện Lâm sàng các bệnh truyền nhiễm",  x: 174, y: 536, floor: 1, isDestination: true },
    { id: "B12", name: "Nhà để xe nhân viên",                   x: 96,  y: 600, floor: 1, isDestination: true },
    { id: "B13", name: "Nhà lưu trữ",                           x: 96,  y: 520, floor: 1, isDestination: true },
    { id: "B14", name: "Nhà thể thao đa năng (1)",              x: 366, y: 408, floor: 1, isDestination: true },
    { id: "B15", name: "Nhà thể thao đa năng (2)",              x: 366, y: 456, floor: 1, isDestination: true },
    { id: "B16", name: "Nhà tang lễ",                           x: 252, y: 704, floor: 1, isDestination: true },
  ],

  // Lối đi giữa các mốc - dựa theo cách bố trí sân/đường nội bộ trong sơ đồ.
  // Có thể chỉnh lại nếu thực tế lối đi khác (ví dụ có hàng rào, cầu nối riêng...).
  edges: [
    { from: "G_1B", to: "B01" },
    { from: "G_1A", to: "B02" },
    { from: "B01", to: "B03" },
    { from: "B01", to: "B05" },
    { from: "B03", to: "B02" },
    { from: "B02", to: "B04" },
    { from: "B02", to: "B07" },
    { from: "B05", to: "B08" },
    { from: "B08", to: "G_CC" },
    { from: "B07", to: "B06" },
    { from: "B06", to: "B09" },
    { from: "B09", to: "B10" },
    { from: "B09", to: "B14" },
    { from: "B10", to: "B15" },
    { from: "B08", to: "B11" },
    { from: "B11", to: "B13" },
    { from: "B13", to: "G_5" },
    { from: "G_5", to: "B12" },
    { from: "B11", to: "B16" },
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
