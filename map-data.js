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
 * Node = một điểm mốc (cổng, hoặc khu nhà) -> cũng là nội dung mã QR dán tại đó.
 * Edge = một đoạn lối đi nối 2 mốc (không cần vẽ chi tiết từng ngã rẽ nhỏ).
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
