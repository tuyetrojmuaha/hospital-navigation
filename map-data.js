/**
 * DỮ LIỆU SƠ ĐỒ BỆNH VIỆN
 * --------------------------------------------------------
 * - Mỗi "node" là một điểm trên sơ đồ (phòng, ngã rẽ, thang máy...).
 *   id       : mã định danh duy nhất -> đây cũng là nội dung mã QR dán trên tường
 *   name     : tên hiển thị (tiếng Việt)
 *   x, y     : toạ độ trên bản đồ (đơn vị pixel, dùng để vẽ SVG)
 *   floor    : tầng
 *   isDestination : true nếu đây là nơi bệnh nhân có thể chọn làm đích đến
 *
 * - Mỗi "edge" là một đoạn hành lang nối 2 node.
 *   weight     : độ dài / thời gian đi (dùng để tính đường ngắn nhất)
 *   isElevator : true nếu đoạn này là di chuyển bằng thang máy/thang bộ (đổi tầng)
 *   instruction: (tuỳ chọn) chỉ dẫn đặc biệt, ví dụ "Đi thang máy lên Tầng 2"
 *
 * MUỐN THÊM PHÒNG / HÀNH LANG MỚI: chỉ cần thêm vào mảng nodes/edges bên dưới.
 * Toạ độ x,y có thể đo tương đối theo bản vẽ mặt bằng thật của bệnh viện (đơn vị mét x 10 chẳng hạn).
 */

const HOSPITAL_MAP = {
  nodes: [
    // ----- TẦNG 1 -----
    { id: "A0", name: "Sảnh chính",         x: 60,  y: 420, floor: 1, isDestination: true },
    { id: "A1", name: "Quầy tiếp đón",      x: 180, y: 420, floor: 1, isDestination: true },
    { id: "A2", name: "Khoa Cấp cứu",       x: 180, y: 260, floor: 1, isDestination: true },
    { id: "A3", name: "Nhà thuốc",          x: 320, y: 420, floor: 1, isDestination: true },
    { id: "E1", name: "Thang máy A",        x: 320, y: 260, floor: 1, isDestination: false },
    { id: "A4", name: "Khoa Nội",           x: 460, y: 260, floor: 1, isDestination: true },
    { id: "A5", name: "Khoa Ngoại",         x: 460, y: 420, floor: 1, isDestination: true },

    // ----- TẦNG 2 (kết nối qua thang máy A) -----
    { id: "E1_F2", name: "Thang máy A (Tầng 2)", x: 320, y: 260, floor: 2, isDestination: false },
    { id: "B1", name: "Khoa Sản",           x: 180, y: 260, floor: 2, isDestination: true },
    { id: "B2", name: "Khoa Nhi",           x: 460, y: 260, floor: 2, isDestination: true },
    { id: "B3", name: "Phòng xét nghiệm",   x: 460, y: 420, floor: 2, isDestination: true },
  ],

  edges: [
    { from: "A0", to: "A1", weight: 12 },
    { from: "A1", to: "A2", weight: 16 },
    { from: "A1", to: "A3", weight: 14 },
    { from: "A3", to: "E1", weight: 16 },
    { from: "E1", to: "A4", weight: 14 },
    { from: "A3", to: "A5", weight: 14 },
    { from: "E1", to: "E1_F2", weight: 8, isElevator: true, instruction: "Đi thang máy A lên Tầng 2" },
    { from: "E1_F2", to: "B1", weight: 14 },
    { from: "E1_F2", to: "B2", weight: 14 },
    { from: "E1_F2", to: "B3", weight: 16 },
  ],
};
