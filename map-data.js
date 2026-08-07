/**
 * DỮ LIỆU SƠ ĐỒ - BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
 * Số 01 Trần Hưng Đạo, phường Hai Bà Trưng, Hà Nội
 * --------------------------------------------------------
 * Toạ độ x,y bên dưới được đo trên ảnh nền thật (map-image.js, kích thước 1000x1298 px).
 * SVG sẽ vẽ đè lên đúng ảnh này bằng cách dùng viewBox trùng kích thước ảnh, nên KHÔNG được
 * đổi kích thước ảnh mà không cập nhật lại MAP_IMAGE bên dưới.
 *
 * Node = một điểm mốc. Có 4 loại:
 *   - Khu nhà / cổng (isDestination / isGate): điểm bắt đầu (quét QR) hoặc đích đến.
 *   - Cửa vào (isEntrance): điểm CỬA THẬT của một khu nhà, nối tới node ảo của khu nhà đó
 *     (field parentBuilding) bằng 1 edge ngắn. Khu nhà nào có nhiều cửa (như Toà Tháp đôi -
 *     B08 với Sảnh A/B/C + Cấp cứu) thì tách thành nhiều node isEntrance, Dijkstra sẽ tự
 *     chọn cửa gần nhất. Các khu nhà còn lại hiện chỉ có 1 điểm ước lượng gần cửa (xem dưới),
 *     không tách thành isEntrance vì sơ đồ tổng thể không ghi rõ vị trí cửa của chúng.
 *   - Waypoint (isWaypoint): điểm gãy của lối đi thật, đặt tại các hàng mũi tên đỏ hai chiều
 *     trên sơ đồ gốc. Không hiện trong danh sách chọn đích, không có mã QR.
 *
 * GIỚI HẠN HIỆN TẠI - LỐI ĐI TRONG NHÀ:
 * Sơ đồ gốc (T1.pdf) chỉ là bản vẽ mặt bằng TỔNG THỂ (nhìn từ trên xuống) + bảng liệt kê
 * khoa/tầng bằng chữ. Nó KHÔNG có bản vẽ mặt bằng nội thất (hành lang, cầu thang, vị trí
 * phòng) của từng tầng/từng toà, nên hệ thống chưa thể dẫn đường bên trong toà nhà (chỉ dẫn
 * dừng lại ở "vào toà nhà qua cửa nào, lên tầng mấy"). Muốn có bước này, cần bản vẽ mặt bằng
 * nội thất riêng cho từng toà/từng tầng (ảnh hoặc CAD) - xem khung INDOOR_PLANS ở cuối file,
 * đã dựng sẵn cấu trúc để cắm dữ liệu này vào khi có, dùng chung logic Dijkstra/vẽ SVG như
 * bản đồ tổng thể, chỉ khác ảnh nền và toạ độ là của riêng từng tầng.
 *
 * Edge = một đoạn lối đi nối 2 mốc. Để đường đi không cắt xuyên qua nhà khác, mỗi khu nhà/cổng
 * chỉ nên nối tới waypoint gần nhất (không nối thẳng khu nhà này với khu nhà kia).
 * Trọng số (weight) của edge được TỰ TÍNH bằng khoảng cách toạ độ (xem app.js), trừ khi bạn tự
 * khai báo weight cụ thể. Một edge cũng có thể khai báo `instruction` + `icon` riêng (xem các
 * edge cửa vào của B08) để hiện đúng câu chỉ dẫn thay vì tự tính rẽ trái/phải.
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
    // Toạ độ đã dịch nhẹ (~16px) về phía lối đi/waypoint kết nối gần nhất, để gần với
    // "cửa vào" hơn là tâm hình khối của toà nhà (xem ghi chú CỬA VÀO ở đầu file).
    { id: "B01", name: "Nhà N1A",                              x: 296, y: 386,  floor: 1, isDestination: true },
    { id: "B02", name: "Nhà N1B",                              x: 422, y: 386,  floor: 1, isDestination: true },
    { id: "B03", name: "Nhà N2A",                              x: 374, y: 448,  floor: 1, isDestination: true },
    { id: "B04", name: "Nhà N2B",                              x: 405, y: 459,  floor: 1, isDestination: true },
    { id: "B05", name: "Trung tâm máy gia tốc",                x: 273, y: 468,  floor: 1, isDestination: true },
    { id: "B06", name: "Nhà N3",                                x: 472, y: 520,  floor: 1, isDestination: true },
    { id: "B07", name: "Trung tâm thẩm mỹ",                    x: 567, y: 431,  floor: 1, isDestination: true },
    { id: "B08", name: "Tòa Tháp đôi",                          x: 220, y: 675,  floor: 1, isDestination: true },
    { id: "B09", name: "Viện Bảo vệ, chăm sóc SK cán bộ TW",    x: 466, y: 642,  floor: 1, isDestination: true },
    { id: "B10", name: "Nhà Chỉ huy cơ quan",                   x: 475, y: 757,  floor: 1, isDestination: true },
    { id: "B11", name: "Viện Lâm sàng các bệnh truyền nhiễm",  x: 292, y: 886,  floor: 1, isDestination: true },
    { id: "B12", name: "Nhà để xe nhân viên",                   x: 176, y: 970,  floor: 1, isDestination: true },
    { id: "B13", name: "Nhà lưu trữ",                           x: 160, y: 860,  floor: 1, isDestination: true },
    { id: "B14", name: "Nhà thể thao đa năng (1)",              x: 595, y: 656,  floor: 1, isDestination: true },
    { id: "B15", name: "Nhà thể thao đa năng (2)",              x: 595, y: 745,  floor: 1, isDestination: true },
    { id: "B16", name: "Nhà tang lễ",                           x: 417, y: 1126, floor: 1, isDestination: true },

    // ----- HANH LANG NOI THAT B01 (Nhà N1A) - lap lai o ca 4 tang -----
    { id: "B01_F1_1", name: "Hành lang Tầng 1", x: 256, y: 400, floor: 1, isWaypoint: true },
    { id: "B01_F1_2", name: "Hành lang Tầng 1", x: 276, y: 399, floor: 1, isWaypoint: true },
    { id: "B01_F1_3", name: "Hành lang Tầng 1", x: 294, y: 398, floor: 1, isWaypoint: true },
    { id: "B01_F1_4", name: "Hành lang Tầng 1", x: 311, y: 399, floor: 1, isWaypoint: true },
    { id: "B01_F1_5", name: "Hành lang Tầng 1", x: 326, y: 398, floor: 1, isWaypoint: true },
    { id: "B01_F2_1", name: "Hành lang Tầng 2", x: 256, y: 400, floor: 2, isWaypoint: true },
    { id: "B01_F2_2", name: "Hành lang Tầng 2", x: 276, y: 399, floor: 2, isWaypoint: true },
    { id: "B01_F2_3", name: "Hành lang Tầng 2", x: 294, y: 398, floor: 2, isWaypoint: true },
    { id: "B01_F2_4", name: "Hành lang Tầng 2", x: 311, y: 399, floor: 2, isWaypoint: true },
    { id: "B01_F2_5", name: "Hành lang Tầng 2", x: 326, y: 398, floor: 2, isWaypoint: true },
    { id: "B01_F3_1", name: "Hành lang Tầng 3", x: 256, y: 400, floor: 3, isWaypoint: true },
    { id: "B01_F3_2", name: "Hành lang Tầng 3", x: 276, y: 399, floor: 3, isWaypoint: true },
    { id: "B01_F3_3", name: "Hành lang Tầng 3", x: 294, y: 398, floor: 3, isWaypoint: true },
    { id: "B01_F3_4", name: "Hành lang Tầng 3", x: 311, y: 399, floor: 3, isWaypoint: true },
    { id: "B01_F3_5", name: "Hành lang Tầng 3", x: 326, y: 398, floor: 3, isWaypoint: true },
    { id: "B01_F4_1", name: "Hành lang Tầng 4", x: 256, y: 400, floor: 4, isWaypoint: true },
    { id: "B01_F4_2", name: "Hành lang Tầng 4", x: 276, y: 399, floor: 4, isWaypoint: true },
    { id: "B01_F4_3", name: "Hành lang Tầng 4", x: 294, y: 398, floor: 4, isWaypoint: true },
    { id: "B01_F4_4", name: "Hành lang Tầng 4", x: 311, y: 399, floor: 4, isWaypoint: true },
    { id: "B01_F4_5", name: "Hành lang Tầng 4", x: 326, y: 398, floor: 4, isWaypoint: true },

    // ----- HANH LANG NOI THAT B02 (Nhà N1B) - lap lai o ca 4 tang -----
    { id: "B02_F1_1", name: "Hành lang Tầng 1", x: 400, y: 397, floor: 1, isWaypoint: true },
    { id: "B02_F1_2", name: "Hành lang Tầng 1", x: 414, y: 397, floor: 1, isWaypoint: true },
    { id: "B02_F1_3", name: "Hành lang Tầng 1", x: 430, y: 399, floor: 1, isWaypoint: true },
    { id: "B02_F1_4", name: "Hành lang Tầng 1", x: 448, y: 401, floor: 1, isWaypoint: true },
    { id: "B02_F1_5", name: "Hành lang Tầng 1", x: 466, y: 410, floor: 1, isWaypoint: true },
    { id: "B02_F1_6", name: "Hành lang Tầng 1", x: 482, y: 418, floor: 1, isWaypoint: true },
    { id: "B02_F2_1", name: "Hành lang Tầng 2", x: 400, y: 397, floor: 2, isWaypoint: true },
    { id: "B02_F2_2", name: "Hành lang Tầng 2", x: 414, y: 397, floor: 2, isWaypoint: true },
    { id: "B02_F2_3", name: "Hành lang Tầng 2", x: 430, y: 399, floor: 2, isWaypoint: true },
    { id: "B02_F2_4", name: "Hành lang Tầng 2", x: 448, y: 401, floor: 2, isWaypoint: true },
    { id: "B02_F2_5", name: "Hành lang Tầng 2", x: 466, y: 410, floor: 2, isWaypoint: true },
    { id: "B02_F2_6", name: "Hành lang Tầng 2", x: 482, y: 418, floor: 2, isWaypoint: true },
    { id: "B02_F3_1", name: "Hành lang Tầng 3", x: 400, y: 397, floor: 3, isWaypoint: true },
    { id: "B02_F3_2", name: "Hành lang Tầng 3", x: 414, y: 397, floor: 3, isWaypoint: true },
    { id: "B02_F3_3", name: "Hành lang Tầng 3", x: 430, y: 399, floor: 3, isWaypoint: true },
    { id: "B02_F3_4", name: "Hành lang Tầng 3", x: 448, y: 401, floor: 3, isWaypoint: true },
    { id: "B02_F3_5", name: "Hành lang Tầng 3", x: 466, y: 410, floor: 3, isWaypoint: true },
    { id: "B02_F3_6", name: "Hành lang Tầng 3", x: 482, y: 418, floor: 3, isWaypoint: true },
    { id: "B02_F4_1", name: "Hành lang Tầng 4", x: 400, y: 397, floor: 4, isWaypoint: true },
    { id: "B02_F4_2", name: "Hành lang Tầng 4", x: 414, y: 397, floor: 4, isWaypoint: true },
    { id: "B02_F4_3", name: "Hành lang Tầng 4", x: 430, y: 399, floor: 4, isWaypoint: true },
    { id: "B02_F4_4", name: "Hành lang Tầng 4", x: 448, y: 401, floor: 4, isWaypoint: true },
    { id: "B02_F4_5", name: "Hành lang Tầng 4", x: 466, y: 410, floor: 4, isWaypoint: true },
    { id: "B02_F4_6", name: "Hành lang Tầng 4", x: 482, y: 418, floor: 4, isWaypoint: true },

    // ----- HANH LANG NOI THAT B03 (Nhà N2A) - lap lai o ca 4 tang -----
    { id: "B03_F1_1", name: "Hành lang Tầng 1", x: 355, y: 412, floor: 1, isWaypoint: true },
    { id: "B03_F1_2", name: "Hành lang Tầng 1", x: 350, y: 428, floor: 1, isWaypoint: true },
    { id: "B03_F1_3", name: "Hành lang Tầng 1", x: 356, y: 442, floor: 1, isWaypoint: true },
    { id: "B03_F1_4", name: "Hành lang Tầng 1", x: 355, y: 462, floor: 1, isWaypoint: true },
    { id: "B03_F2_1", name: "Hành lang Tầng 2", x: 355, y: 412, floor: 2, isWaypoint: true },
    { id: "B03_F2_2", name: "Hành lang Tầng 2", x: 350, y: 428, floor: 2, isWaypoint: true },
    { id: "B03_F2_3", name: "Hành lang Tầng 2", x: 356, y: 442, floor: 2, isWaypoint: true },
    { id: "B03_F2_4", name: "Hành lang Tầng 2", x: 355, y: 462, floor: 2, isWaypoint: true },
    { id: "B03_F3_1", name: "Hành lang Tầng 3", x: 355, y: 412, floor: 3, isWaypoint: true },
    { id: "B03_F3_2", name: "Hành lang Tầng 3", x: 350, y: 428, floor: 3, isWaypoint: true },
    { id: "B03_F3_3", name: "Hành lang Tầng 3", x: 356, y: 442, floor: 3, isWaypoint: true },
    { id: "B03_F3_4", name: "Hành lang Tầng 3", x: 355, y: 462, floor: 3, isWaypoint: true },
    { id: "B03_F4_1", name: "Hành lang Tầng 4", x: 355, y: 412, floor: 4, isWaypoint: true },
    { id: "B03_F4_2", name: "Hành lang Tầng 4", x: 350, y: 428, floor: 4, isWaypoint: true },
    { id: "B03_F4_3", name: "Hành lang Tầng 4", x: 356, y: 442, floor: 4, isWaypoint: true },
    { id: "B03_F4_4", name: "Hành lang Tầng 4", x: 355, y: 462, floor: 4, isWaypoint: true },

    // ----- HANH LANG NOI THAT B06 (Nhà N3) - lap lai o ca 4 tang -----
    { id: "B06_F1_1", name: "Hành lang Tầng 1", x: 414, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_2", name: "Hành lang Tầng 1", x: 436, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_3", name: "Hành lang Tầng 1", x: 459, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_4", name: "Hành lang Tầng 1", x: 477, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_5", name: "Hành lang Tầng 1", x: 494, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_6", name: "Hành lang Tầng 1", x: 520, y: 506, floor: 1, isWaypoint: true },
    { id: "B06_F1_7", name: "Hành lang Tầng 1", x: 546, y: 505, floor: 1, isWaypoint: true },
    { id: "B06_F2_1", name: "Hành lang Tầng 2", x: 414, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_2", name: "Hành lang Tầng 2", x: 436, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_3", name: "Hành lang Tầng 2", x: 459, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_4", name: "Hành lang Tầng 2", x: 477, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_5", name: "Hành lang Tầng 2", x: 494, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_6", name: "Hành lang Tầng 2", x: 520, y: 506, floor: 2, isWaypoint: true },
    { id: "B06_F2_7", name: "Hành lang Tầng 2", x: 546, y: 505, floor: 2, isWaypoint: true },
    { id: "B06_F3_1", name: "Hành lang Tầng 3", x: 414, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_2", name: "Hành lang Tầng 3", x: 436, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_3", name: "Hành lang Tầng 3", x: 459, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_4", name: "Hành lang Tầng 3", x: 477, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_5", name: "Hành lang Tầng 3", x: 494, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_6", name: "Hành lang Tầng 3", x: 520, y: 506, floor: 3, isWaypoint: true },
    { id: "B06_F3_7", name: "Hành lang Tầng 3", x: 546, y: 505, floor: 3, isWaypoint: true },
    { id: "B06_F4_1", name: "Hành lang Tầng 4", x: 414, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_2", name: "Hành lang Tầng 4", x: 436, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_3", name: "Hành lang Tầng 4", x: 459, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_4", name: "Hành lang Tầng 4", x: 477, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_5", name: "Hành lang Tầng 4", x: 494, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_6", name: "Hành lang Tầng 4", x: 520, y: 506, floor: 4, isWaypoint: true },
    { id: "B06_F4_7", name: "Hành lang Tầng 4", x: 546, y: 505, floor: 4, isWaypoint: true },

    // ----- CỬA VÀO THẬT CỦA TOÀ THÁP ĐÔI (B08) -----
    // Đây là toà nhà DUY NHẤT trong sơ đồ ghi rõ nhiều cửa vào riêng biệt (Sảnh A, Sảnh B,
    // Sảnh C + 1 lối Cấp cứu riêng, có icon chữ thập đỏ). Mỗi cửa là 1 node isEntrance:true,
    // nối vào B08 (node ảo đại diện cho cả toà nhà, dùng để tìm kiếm/hiện tên) bằng 1 edge
    // ngắn — nhờ vậy Dijkstra tự chọn cửa GẦN NHẤT theo hướng người dùng đang đi tới.
    // Lưu ý: chưa xác định được khoa nào trong B08 đi qua cửa nào (sơ đồ không ghi), nên
    // danh mục khoa/phòng của B08 (BUILDING_DIRECTORY) vẫn dùng chung, chỉ khác ở việc
    // chọn cửa vào gần nhất khi đến nơi.
    // (4 cửa vào ước lượng cũ B08_SANHA/B/C/CAPCUU đã được thay bằng 10 điểm chi tiết thật
    // ở khối "B08 (Toà Tháp đôi)" bên dưới, dựa theo toạ độ + tên khu chức năng bạn cung cấp.)

    // ===== DIEM MAT BANG (v2 - gon hon, 51 diem, do nguoi dung tu danh dau lai) =====
    { id: "P_G1", name: "Lối đi gần Nhà N1A", x: 324, y: 310, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G2", name: "Lối đi gần Nhà N1B", x: 409, y: 338, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G3", name: "Lối đi", x: 374, y: 338, floor: 1, isWaypoint: true },
    { id: "P_G4", name: "Lối đi", x: 374, y: 380, floor: 1, isWaypoint: true },
    { id: "P_G5", name: "Lối đi", x: 226, y: 380, floor: 1, isWaypoint: true },
    { id: "P_G6", name: "Lối đi", x: 326, y: 380, floor: 1, isWaypoint: true },
    { id: "P_G7", name: "Lối đi", x: 351, y: 380, floor: 1, isWaypoint: true },
    { id: "P_G8", name: "Lối đi", x: 526, y: 394, floor: 1, isWaypoint: true },
    { id: "P_G9", name: "Lối đi", x: 591, y: 408, floor: 1, isWaypoint: true },
    { id: "P_G10", name: "Lối đi", x: 222, y: 423, floor: 1, isWaypoint: true },
    { id: "P_G11", name: "Lối đi gần Trung tâm máy gia tốc", x: 243, y: 424, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G12", name: "Lối đi", x: 348, y: 428, floor: 1, isWaypoint: true },
    { id: "P_G13", name: "Lối đi", x: 381, y: 429, floor: 1, isWaypoint: true },
    { id: "P_G14", name: "Lối đi gần Nhà N1A", x: 320, y: 430, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G15", name: "Lối đi", x: 528, y: 454, floor: 1, isWaypoint: true },
    { id: "P_G16", name: "Lối đi gần Nhà N3", x: 495, y: 456, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G17", name: "Lối đi gần Nhà N2B", x: 412, y: 458, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G18", name: "Lối đi", x: 218, y: 461, floor: 1, isWaypoint: true },
    { id: "P_G19", name: "Lối đi gần Cổng Cấp cứu", x: 116, y: 484, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G20", name: "Lối đi", x: 218, y: 487, floor: 1, isWaypoint: true },
    { id: "P_G21", name: "Lối đi gần Nhà N2A", x: 354, y: 514, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G22", name: "Lối đi", x: 185, y: 548, floor: 1, isWaypoint: true },
    { id: "P_G23", name: "Lối đi", x: 219, y: 548, floor: 1, isWaypoint: true },
    { id: "P_G24", name: "Lối đi", x: 359, y: 550, floor: 1, isWaypoint: true },
    { id: "P_G25", name: "Lối đi", x: 394, y: 550, floor: 1, isWaypoint: true },
    { id: "P_G26", name: "Lối đi gần Cổng Cấp cứu", x: 142, y: 552, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G27", name: "Lối đi gần Viện Bảo vệ, chăm sóc SK cán bộ TW", x: 360, y: 588, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G28", name: "Lối đi", x: 392, y: 644, floor: 1, isWaypoint: true },
    { id: "P_G29", name: "Lối đi", x: 361, y: 646, floor: 1, isWaypoint: true },
    { id: "P_G30", name: "Lối đi", x: 290, y: 678, floor: 1, isWaypoint: true },
    { id: "P_G31", name: "Lối đi", x: 360, y: 704, floor: 1, isWaypoint: true },
    { id: "P_G32", name: "Lối đi", x: 392, y: 705, floor: 1, isWaypoint: true },
    { id: "P_G33", name: "Lối đi", x: 497, y: 707, floor: 1, isWaypoint: true },
    { id: "P_G34", name: "Lối đi", x: 360, y: 730, floor: 1, isWaypoint: true },
    { id: "P_G35", name: "Lối đi", x: 392, y: 730, floor: 1, isWaypoint: true },
    { id: "P_G36", name: "Lối đi gần Nhà Chỉ huy cơ quan", x: 439, y: 754, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G37", name: "Lối đi", x: 358, y: 773, floor: 1, isWaypoint: true },
    { id: "P_G38", name: "Lối đi", x: 358, y: 802, floor: 1, isWaypoint: true },
    { id: "P_G39", name: "Lối đi", x: 374, y: 802, floor: 1, isWaypoint: true },
    { id: "P_G40", name: "Lối đi", x: 182, y: 808, floor: 1, isWaypoint: true },
    { id: "P_G41", name: "Lối đi", x: 204, y: 808, floor: 1, isWaypoint: true },
    { id: "P_G42", name: "Lối đi gần Viện Lâm sàng các bệnh truyền nhiễm", x: 376, y: 890, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G43", name: "Lối đi gần Nhà lưu trữ", x: 202, y: 895, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G44", name: "Lối đi gần Viện Lâm sàng các bệnh truyền nhiễm", x: 302, y: 894, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G45", name: "Lối đi", x: 162, y: 926, floor: 1, isWaypoint: true },
    { id: "P_G46", name: "Lối đi gần Nhà để xe nhân viên", x: 200, y: 928, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G47", name: "Lối đi", x: 290, y: 1030, floor: 1, isWaypoint: true },
    { id: "P_G48", name: "Lối đi gần Nhà để xe nhân viên", x: 136, y: 1030, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G49", name: "Lối đi gần Nhà để xe nhân viên", x: 195, y: 1031, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G50", name: "Lối đi gần Nhà tang lễ", x: 292, y: 1126, floor: 1, isWaypoint: true, isQRPoint: true },
    { id: "P_G51", name: "Lối đi", x: 346, y: 1127, floor: 1, isWaypoint: true },
    // Điểm bổ sung: mép sân lát đá bên trái đỉnh vườn hoa tam giác (giữa Toà Tháp đôi và Nhà 09),
    // để đi thẳng theo đúng mép sân thay vì vòng xa qua bên phải/dưới vườn hoa.
    // (Đã bỏ P_G52 - nối thẳng P_G27 tới P_G30 đi sát đúng đỉnh chóp tam giác vườn hoa,
    // không cần điểm trung gian.)
    // ===== B01 (Nhà N1A) - TANG 1: 5 khu chuc nang rieng =====
    { id: "B01_F1_THUOC", name: "Nhà thuốc số 2 (Nhà N1A, Tầng 1)", x: 257, y: 399, floor: 1, isDestination: true },
    { id: "B01_F1_DKKD", name: "Khu đăng ký khám dịch vụ (Nhà N1A, Tầng 1)", x: 294, y: 390, floor: 1, isDestination: true },
    { id: "B01_F1_BHYT", name: "Khu đăng ký khám BHYT (Nhà N1A, Tầng 1)", x: 311, y: 398, floor: 1, isDestination: true },
    { id: "B01_F1_HD", name: "Khu hướng dẫn (Nhà N1A, Tầng 1)", x: 327, y: 398, floor: 1, isDestination: true },
    { id: "B01_F1_TT", name: "Khu thanh toán (Nhà N1A, Tầng 1)", x: 376, y: 398, floor: 1, isDestination: true },

    // ===== B02 (Nhà N1B) - TANG 1: 2 khu chuc nang =====
    { id: "B02_F1_XQUANG", name: "Khu vực Xquang (Nhà N1B, Tầng 1)", x: 400, y: 397, floor: 1, isDestination: true },
    { id: "B02_F1_MRI", name: "Khu vực Cộng hưởng từ MRI (Nhà N1B, Tầng 1)", x: 400, y: 410, floor: 1, isDestination: true },

    // ===== B03 (Nhà N2A) - moi tang 1 khu duy nhat =====
    { id: "B03_F1_BHYT", name: "Khu vực cấp phát thuốc BHYT (Nhà N2A, Tầng 1)", x: 337, y: 440, floor: 1, isDestination: true },

    // ===== B06 (Nhà N3) - TANG 1 =====
    { id: "B06_F1_XQUANG", name: "Khu vực Xquang, điện tim, siêu âm (Nhà N3, Tầng 1)", x: 521, y: 507, floor: 1, isDestination: true },
    { id: "B06_TM", name: "Thang máy (Nhà N3)", x: 478, y: 507, floor: 1, isDestination: true },
    { id: "B06_TB", name: "Thang bộ (Nhà N3)", x: 506, y: 497, floor: 1, isDestination: true, isTransitPoint: true },

    // ===== B08 (Toà Tháp đôi) - 10 diem chi tiet, thay cho 4 cua vao uoc luong cu =====
    { id: "B08_CAPCUU", name: "Khu Cấp cứu C1.3 (Toà Tháp đôi)", x: 142, y: 566, floor: 1, isDestination: true },
    { id: "B08_KHAMA", name: "Khu khám A - Bộ đội hưu và Viettel (Toà Tháp đôi)", x: 209, y: 592, floor: 1, isDestination: true },
    { id: "B08_NGOAIKHOA", name: "Nhà Ngoại khoa (Toà Tháp đôi)", x: 237, y: 593, floor: 1, isDestination: true },
    { id: "B08_TM_NGOAIKHOA", name: "Thang máy Nhà Ngoại khoa (Toà Tháp đôi)", x: 200, y: 628, floor: 1, isDestination: true, isTransitPoint: true },
    { id: "B08_TM_CANLAMSANG", name: "Khối nhà Cận lâm sàng - thang máy (Toà Tháp đôi)", x: 167, y: 669, floor: 1, isDestination: true, isTransitPoint: true },
    { id: "B08_SANHCHINH", name: "Sảnh chính Toà Tháp đôi", x: 235, y: 670, floor: 1, isDestination: true },
    { id: "B08_KHAMB", name: "Khu khám B, khu thanh toán (Toà Tháp đôi)", x: 209, y: 729, floor: 1, isDestination: true },
    { id: "B08_NHATHUOC1", name: "Nhà thuốc số 1 (Toà Tháp đôi)", x: 144, y: 717, floor: 1, isDestination: true },
    { id: "B08_NOIKHOA", name: "Nhà Nội khoa (Toà Tháp đôi)", x: 237, y: 733, floor: 1, isDestination: true },
    { id: "B08_TM_NOIKHOA", name: "Thang máy Nhà Nội khoa (Toà Tháp đôi)", x: 200, y: 705, floor: 1, isDestination: true, isTransitPoint: true },

    // ===== B10 (Nha Chi huy co quan) - 2 sanh rieng =====
    { id: "B10_SANHB", name: "Sảnh B (Nhà Chỉ huy cơ quan)", x: 447, y: 750, floor: 1, isDestination: true },
    { id: "B10_SANHA", name: "Sảnh A (Nhà Chỉ huy cơ quan)", x: 497, y: 722, floor: 1, isDestination: true },

    // ===== B13 - loi vao cu the =====
    { id: "B13_LOIVAO", name: "Lối vào Nhà lưu trú", x: 160, y: 910, floor: 1, isDestination: true },
  ],

  // Lối đi giữa các mốc - đi theo khoảng SÂN/ĐƯỜNG TRỐNG thực tế, ĐÚNG TẠI các hàng mũi tên
  // đỏ hai chiều trên sơ đồ gốc. KHÔNG nối thẳng building với building.
  edges: [
    { from: "B01_F1_THUOC", to: "B01_F1_DKKD" },
    { from: "B01_F1_DKKD", to: "B01_F1_BHYT" },
    { from: "B01_F1_BHYT", to: "B01_F1_HD" },
    { from: "B01_F1_HD", to: "B01_F1_TT" },
    { from: "B01", to: "B01_F1_THUOC" },
    { from: "B01_F1_HD", to: "B01_F2_5", isElevator: true, instruction: "Đi thang máy/thang bộ (cạnh Khu hướng dẫn) lên Tầng 2 - Nhà N1A" },
    { from: "B01_F1_DKKD", to: "B01_F2_5", isElevator: true, instruction: "Đi thang máy/thang bộ (cạnh Khu đăng ký khám dịch vụ) lên Tầng 2 - Nhà N1A" },
    { from: "B02_F1_XQUANG", to: "B02_F1_MRI" },
    { from: "B02", to: "B02_F1_XQUANG" },
    { from: "B02_F1_XQUANG", to: "B02_F2_6", isElevator: true, instruction: "Đi thang bộ lên Tầng 2 - Nhà N1B" },
    { from: "B03", to: "B03_F1_BHYT" },
    { from: "B03_F1_BHYT", to: "B03_F2_4", isElevator: true, instruction: "Đi thang máy/thang bộ lên Tầng 2 - Nhà N2A" },
    { from: "B06", to: "B06_F1_XQUANG" },
    { from: "B06_F1_XQUANG", to: "B06_TB" },
    { from: "B06_TB", to: "B06_TM" },
    { from: "B06_TM", to: "B06_F2_7", isElevator: true, instruction: "Đi thang máy lên Tầng 2 - Nhà N3" },
    { from: "B08_CAPCUU", to: "B08_KHAMA" },
    { from: "B08_KHAMA", to: "B08_NGOAIKHOA" },
    { from: "B08_NGOAIKHOA", to: "B08_TM_NGOAIKHOA" },
    { from: "B08_TM_NGOAIKHOA", to: "B08_TM_CANLAMSANG" },
    { from: "B08_TM_CANLAMSANG", to: "B08_SANHCHINH" },
    { from: "B08_SANHCHINH", to: "B08_KHAMB" },
    { from: "B08_KHAMB", to: "B08_NHATHUOC1" },
    { from: "B08_KHAMB", to: "B08_NOIKHOA" },
    { from: "B08_NOIKHOA", to: "B08_TM_NOIKHOA" },
    { from: "B08", to: "B08_SANHCHINH" },
    // (3 cầu nối cũ B08_SANHCHINH/CAPCUU/NOIKHOA -> P_G86/101/128 đã được thay bằng kết nối
    // mới tới mạng lưới P_G v2 ở block "NOI KHU NHA/CONG/HANH LANG..." bên dưới)
    { from: "B10_SANHA", to: "B10_SANHB" },
    { from: "B10", to: "B10_SANHA" },
    { from: "B13", to: "B13_LOIVAO" },
    { from: "B01_F1_1", to: "B01_F1_2" },
    { from: "B01_F1_2", to: "B01_F1_3" },
    { from: "B01_F1_3", to: "B01_F1_4" },
    { from: "B01_F1_4", to: "B01_F1_5" },
    { from: "B01", to: "B01_F1_1" },
    { from: "B01_F2_1", to: "B01_F2_2" },
    { from: "B01_F2_2", to: "B01_F2_3" },
    { from: "B01_F2_3", to: "B01_F2_4" },
    { from: "B01_F2_4", to: "B01_F2_5" },
    { from: "B01_F1_5", to: "B01_F2_5", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 2 - Nhà N1A" },
    { from: "B01_F3_1", to: "B01_F3_2" },
    { from: "B01_F3_2", to: "B01_F3_3" },
    { from: "B01_F3_3", to: "B01_F3_4" },
    { from: "B01_F3_4", to: "B01_F3_5" },
    { from: "B01_F2_5", to: "B01_F3_5", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 3 - Nhà N1A" },
    { from: "B01_F4_1", to: "B01_F4_2" },
    { from: "B01_F4_2", to: "B01_F4_3" },
    { from: "B01_F4_3", to: "B01_F4_4" },
    { from: "B01_F4_4", to: "B01_F4_5" },
    { from: "B01_F3_5", to: "B01_F4_5", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 4 - Nhà N1A" },
    { from: "B02_F1_1", to: "B02_F1_2" },
    { from: "B02_F1_2", to: "B02_F1_3" },
    { from: "B02_F1_3", to: "B02_F1_4" },
    { from: "B02_F1_4", to: "B02_F1_5" },
    { from: "B02_F1_5", to: "B02_F1_6" },
    { from: "B02", to: "B02_F1_1" },
    { from: "B02_F2_1", to: "B02_F2_2" },
    { from: "B02_F2_2", to: "B02_F2_3" },
    { from: "B02_F2_3", to: "B02_F2_4" },
    { from: "B02_F2_4", to: "B02_F2_5" },
    { from: "B02_F2_5", to: "B02_F2_6" },
    { from: "B02_F1_6", to: "B02_F2_6", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 2 - Nhà N1B" },
    { from: "B02_F3_1", to: "B02_F3_2" },
    { from: "B02_F3_2", to: "B02_F3_3" },
    { from: "B02_F3_3", to: "B02_F3_4" },
    { from: "B02_F3_4", to: "B02_F3_5" },
    { from: "B02_F3_5", to: "B02_F3_6" },
    { from: "B02_F2_6", to: "B02_F3_6", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 3 - Nhà N1B" },
    { from: "B02_F4_1", to: "B02_F4_2" },
    { from: "B02_F4_2", to: "B02_F4_3" },
    { from: "B02_F4_3", to: "B02_F4_4" },
    { from: "B02_F4_4", to: "B02_F4_5" },
    { from: "B02_F4_5", to: "B02_F4_6" },
    { from: "B02_F3_6", to: "B02_F4_6", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 4 - Nhà N1B" },
    { from: "B03_F1_1", to: "B03_F1_2" },
    { from: "B03_F1_2", to: "B03_F1_3" },
    { from: "B03_F1_3", to: "B03_F1_4" },
    { from: "B03", to: "B03_F1_1" },
    { from: "B03_F2_1", to: "B03_F2_2" },
    { from: "B03_F2_2", to: "B03_F2_3" },
    { from: "B03_F2_3", to: "B03_F2_4" },
    { from: "B03_F1_4", to: "B03_F2_4", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 2 - Nhà N2A" },
    { from: "B03_F3_1", to: "B03_F3_2" },
    { from: "B03_F3_2", to: "B03_F3_3" },
    { from: "B03_F3_3", to: "B03_F3_4" },
    { from: "B03_F2_4", to: "B03_F3_4", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 3 - Nhà N2A" },
    { from: "B03_F4_1", to: "B03_F4_2" },
    { from: "B03_F4_2", to: "B03_F4_3" },
    { from: "B03_F4_3", to: "B03_F4_4" },
    { from: "B03_F3_4", to: "B03_F4_4", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 4 - Nhà N2A" },
    { from: "B06_F1_1", to: "B06_F1_2" },
    { from: "B06_F1_2", to: "B06_F1_3" },
    { from: "B06_F1_3", to: "B06_F1_4" },
    { from: "B06_F1_4", to: "B06_F1_5" },
    { from: "B06_F1_5", to: "B06_F1_6" },
    { from: "B06_F1_6", to: "B06_F1_7" },
    { from: "B06", to: "B06_F1_1" },
    { from: "B06_F2_1", to: "B06_F2_2" },
    { from: "B06_F2_2", to: "B06_F2_3" },
    { from: "B06_F2_3", to: "B06_F2_4" },
    { from: "B06_F2_4", to: "B06_F2_5" },
    { from: "B06_F2_5", to: "B06_F2_6" },
    { from: "B06_F2_6", to: "B06_F2_7" },
    { from: "B06_F1_7", to: "B06_F2_7", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 2 - Nhà N3" },
    { from: "B06_F3_1", to: "B06_F3_2" },
    { from: "B06_F3_2", to: "B06_F3_3" },
    { from: "B06_F3_3", to: "B06_F3_4" },
    { from: "B06_F3_4", to: "B06_F3_5" },
    { from: "B06_F3_5", to: "B06_F3_6" },
    { from: "B06_F3_6", to: "B06_F3_7" },
    { from: "B06_F2_7", to: "B06_F3_7", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 3 - Nhà N3" },
    { from: "B06_F4_1", to: "B06_F4_2" },
    { from: "B06_F4_2", to: "B06_F4_3" },
    { from: "B06_F4_3", to: "B06_F4_4" },
    { from: "B06_F4_4", to: "B06_F4_5" },
    { from: "B06_F4_5", to: "B06_F4_6" },
    { from: "B06_F4_6", to: "B06_F4_7" },
    { from: "B06_F3_7", to: "B06_F4_7", isElevator: true, instruction: "Đi thang máy/cầu thang lên Tầng 4 - Nhà N3" },
    // ===== MANG LUOI LOI DI MAT BANG (v2, ban kinh ghep 90px + cau noi thu cong) =====
    { from: "P_G1", to: "P_G2" },
    { from: "P_G1", to: "P_G3" },
    { from: "P_G1", to: "P_G4" },
    { from: "P_G1", to: "P_G6" },
    { from: "P_G1", to: "P_G7" },
    { from: "P_G2", to: "P_G3" },
    { from: "P_G2", to: "P_G4" },
    { from: "P_G2", to: "P_G7" },
    { from: "P_G3", to: "P_G4" },
    { from: "P_G3", to: "P_G6" },
    { from: "P_G3", to: "P_G7" },
    { from: "P_G4", to: "P_G6" },
    { from: "P_G4", to: "P_G7" },
    { from: "P_G4", to: "P_G12" },
    { from: "P_G4", to: "P_G13" },
    { from: "P_G4", to: "P_G14" },
    { from: "P_G4", to: "P_G17" },
    { from: "P_G5", to: "P_G10" },
    { from: "P_G5", to: "P_G11" },
    { from: "P_G5", to: "P_G18" },
    { from: "P_G6", to: "P_G7" },
    { from: "P_G6", to: "P_G12" },
    { from: "P_G6", to: "P_G13" },
    { from: "P_G6", to: "P_G14" },
    { from: "P_G7", to: "P_G12" },
    { from: "P_G7", to: "P_G13" },
    { from: "P_G7", to: "P_G14" },
    { from: "P_G8", to: "P_G9" },
    { from: "P_G8", to: "P_G15" },
    { from: "P_G8", to: "P_G16" },
    { from: "P_G9", to: "P_G15" },
    { from: "P_G10", to: "P_G11" },
    { from: "P_G10", to: "P_G18" },
    { from: "P_G10", to: "P_G20" },
    { from: "P_G11", to: "P_G14" },
    { from: "P_G11", to: "P_G18" },
    { from: "P_G11", to: "P_G20" },
    { from: "P_G12", to: "P_G13" },
    { from: "P_G12", to: "P_G14" },
    { from: "P_G12", to: "P_G17" },
    { from: "P_G12", to: "P_G21" },
    { from: "P_G13", to: "P_G14" },
    { from: "P_G13", to: "P_G17" },
    { from: "P_G13", to: "P_G21" },
    { from: "P_G15", to: "P_G16" },
    { from: "P_G16", to: "P_G17" },
    { from: "P_G17", to: "P_G21" },
    { from: "P_G18", to: "P_G20" },
    { from: "P_G18", to: "P_G23" },
    { from: "P_G19", to: "P_G26" },
    { from: "P_G20", to: "P_G22" },
    { from: "P_G20", to: "P_G23" },
    { from: "P_G21", to: "P_G24" },
    { from: "P_G21", to: "P_G25" },
    { from: "P_G21", to: "P_G27" },
    { from: "P_G22", to: "P_G23" },
    { from: "P_G22", to: "P_G26" },
    { from: "P_G23", to: "P_G26" },
    { from: "P_G24", to: "P_G25" },
    { from: "P_G24", to: "P_G27" },
    { from: "P_G25", to: "P_G27" },
    { from: "P_G27", to: "P_G28" },
    { from: "P_G27", to: "P_G29" },
    { from: "P_G28", to: "P_G29" },
    { from: "P_G28", to: "P_G31" },
    { from: "P_G28", to: "P_G32" },
    { from: "P_G28", to: "P_G35" },
    // (Đã xoá cạnh P_G29 -> P_G30 vì cắt thẳng qua vườn hoa tam giác giữa Toà Tháp đôi và Nhà 09.
    // Giờ buộc phải đi vòng qua P_G31 - P_G30, đúng theo mép sân quanh vườn hoa.)
    { from: "P_G29", to: "P_G31" },
    { from: "P_G27", to: "P_G30" },
    { from: "P_G29", to: "P_G32" },
    { from: "P_G29", to: "P_G34" },
    { from: "P_G29", to: "P_G35" },
    { from: "P_G30", to: "P_G31" },
    { from: "P_G30", to: "P_G34" },
    { from: "P_G31", to: "P_G32" },
    { from: "P_G31", to: "P_G34" },
    { from: "P_G31", to: "P_G35" },
    { from: "P_G31", to: "P_G37" },
    { from: "P_G32", to: "P_G34" },
    { from: "P_G32", to: "P_G35" },
    { from: "P_G32", to: "P_G36" },
    { from: "P_G32", to: "P_G37" },
    { from: "P_G33", to: "P_G36" },
    { from: "P_G34", to: "P_G35" },
    { from: "P_G34", to: "P_G36" },
    { from: "P_G34", to: "P_G37" },
    { from: "P_G34", to: "P_G38" },
    { from: "P_G34", to: "P_G39" },
    { from: "P_G35", to: "P_G36" },
    { from: "P_G35", to: "P_G37" },
    { from: "P_G35", to: "P_G38" },
    { from: "P_G35", to: "P_G39" },
    { from: "P_G36", to: "P_G37" },
    { from: "P_G36", to: "P_G39" },
    { from: "P_G37", to: "P_G38" },
    { from: "P_G37", to: "P_G39" },
    { from: "P_G38", to: "P_G39" },
    { from: "P_G38", to: "P_G42" },
    { from: "P_G39", to: "P_G42" },
    { from: "P_G40", to: "P_G41" },
    { from: "P_G40", to: "P_G43" },
    { from: "P_G41", to: "P_G43" },
    { from: "P_G42", to: "P_G44" },
    { from: "P_G43", to: "P_G45" },
    { from: "P_G43", to: "P_G46" },
    { from: "P_G45", to: "P_G46" },
    { from: "P_G48", to: "P_G49" },
    { from: "P_G50", to: "P_G51" },
    { from: "P_G44", to: "P_G43" },
    { from: "P_G46", to: "P_G49" },
    { from: "P_G49", to: "P_G50" },
    { from: "P_G49", to: "P_G47" },

    // ===== NOI KHU NHA/CONG/HANH LANG TOI DIEM MAT BANG MOI GAN NHAT =====
    { from: "G_1A", to: "P_G2" },
    { from: "G_1B", to: "P_G1" },
    { from: "G_CC", to: "P_G19" },
    { from: "G_5", to: "P_G48" },
    { from: "B01", to: "P_G6" },
    { from: "B02", to: "P_G4" },
    { from: "B03", to: "P_G13" },
    { from: "B04", to: "P_G17" },
    { from: "B05", to: "P_G11" },
    { from: "B06", to: "P_G16" },
    { from: "B07", to: "P_G9" },
    { from: "B09", to: "P_G33" },
    { from: "B10", to: "P_G36" },
    { from: "B11", to: "P_G44" },
    { from: "B12", to: "P_G45" },
    { from: "B13", to: "P_G43" },
    { from: "B14", to: "P_G33" },
    { from: "B15", to: "P_G33" },
    { from: "B16", to: "P_G51" },
    { from: "B08_SANHCHINH", to: "P_G30" },
    { from: "B08_CAPCUU", to: "P_G26" },
    { from: "B08_NOIKHOA", to: "P_G30" },

    // ===== NOI THANG cho cac diem co cua/loi vao rieng (tranh phai vong qua node cha) =====
    // Phát hiện qua phản hồi thực tế: Sảnh A của B10 nằm xa B10 nên đi vòng xuống B10 trước
    // khi ra ngoài — giờ nối thẳng từng điểm tới đúng lối đi mặt bằng gần NÓ nhất.
    { from: "B10_SANHA", to: "P_G33" },
    { from: "B10_SANHB", to: "P_G36" },
    { from: "B13_LOIVAO", to: "P_G45" },
    { from: "B08_KHAMA", to: "P_G23" },
    { from: "B08_TM_CANLAMSANG", to: "P_G26" },
    { from: "B08_KHAMB", to: "P_G41" },
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
    { floor: 1, desc: "Nhà thuốc số 2 C1.1A", nodeId: "B01_F1_THUOC" },
    { floor: 1, desc: "Khu đăng ký khám dịch vụ C1.1A", nodeId: "B01_F1_DKKD" },
    { floor: 1, desc: "Khu đăng ký khám BHYT C1.1A", nodeId: "B01_F1_BHYT" },
    { floor: 1, desc: "Khu hướng dẫn C1.1A", nodeId: "B01_F1_HD" },
    { floor: 1, desc: "Khu thanh toán C1.1A", nodeId: "B01_F1_TT" },
    { floor: 2, desc: "Các phòng khám từ 1-20 C1.1A", nodeId: "B01_F2_5" },
    { floor: 3, desc: "Khu vực lấy mẫu xét nghiệm theo yêu cầu C1.1B", nodeId: "B01_F3_5" },
    { floor: 4, desc: "Khu vực Xquang, điện tim, siêu âm theo yêu cầu C1.1B", nodeId: "B01_F4_5" },
  ],
  B02: [
    { floor: 1, desc: "Khu vực Xquang C1.1A", nodeId: "B02_F1_XQUANG" },
    { floor: 1, desc: "Khu vực Cộng hưởng từ, MRI C1.1A", nodeId: "B02_F1_MRI" },
    { floor: 2, desc: "Các phòng khám C1.1A", nodeId: "B02_F2_6" },
    { floor: 3, desc: "Các phòng khám theo yêu cầu C1.1B", nodeId: "B02_F3_6" },
    { floor: 4, desc: "Khu vực nội soi theo yêu cầu C1.1B", nodeId: "B02_F4_6" },
  ],
  B03: [
    { floor: 1, desc: "Khu vực cấp phát thuốc BHYT", nodeId: "B03_F1_BHYT" },
    { floor: 2, desc: "Các phòng khám C1.1A", nodeId: "B03_F2_4" },
    { floor: 3, desc: "Các phòng khám theo yêu cầu C1.1B", nodeId: "B03_F3_4" },
    { floor: 4, desc: "Khu vực nội soi theo yêu cầu C1.1B", nodeId: "B03_F4_4" },
  ],
  B04: [
    { floor: 1, desc: "Khu vực nội soi C1.1A", nodeId: "B04" },
  ],
  B05: [
    { floor: null, desc: "Trung tâm máy gia tốc", nodeId: "B05" },
  ],
  B06: [
    { floor: 1, desc: "Khu vực Xquang, điện tim, siêu âm C1.1A", nodeId: "B06_F1_XQUANG" },
    { floor: 2, desc: "Trung tâm khám sức khoẻ định kỳ", nodeId: "B06_F2_7" },
    { floor: 3, desc: "Các phòng khám theo yêu cầu C1.1B", nodeId: "B06_F3_7" },
    { floor: 4, desc: "Khoa điều trị theo yêu cầu C1.1B", nodeId: "B06_F4_7" },
  ],
  B07: [
    { floor: null, desc: "Trung tâm thẩm mỹ", nodeId: "B07" },
  ],
  B08: [
    { floor: null, desc: "Khu Cấp cứu C1.3", nodeId: "B08_CAPCUU" },
    { floor: null, desc: "Khu khám A - Bộ đội hưu và Viettel", nodeId: "B08_KHAMA" },
    { floor: null, desc: "Khu khám B, khu thanh toán", nodeId: "B08_KHAMB" },
    { floor: null, desc: "Nhà thuốc số 1", nodeId: "B08_NHATHUOC1" },
    { floor: null, desc: "Nhà Nội khoa", nodeId: "B08_NOIKHOA" },
    { floor: null, desc: "Nhà Ngoại khoa", nodeId: "B08_NGOAIKHOA" },
    { floor: null, desc: "Khối nhà Cận lâm sàng", nodeId: "B08_TM_CANLAMSANG" },
  ],
  B09: [
    { floor: null, desc: "Viện Bảo vệ, chăm sóc sức khoẻ cán bộ Trung ương" },
  ],
  B10: [
    { floor: null, desc: "Sảnh A - Ban Giám đốc", nodeId: "B10_SANHA" },
    { floor: null, desc: "Sảnh B - Khối cơ quan", nodeId: "B10_SANHB" },
  ],
  B11: [
    { floor: 1, desc: "Khu khám bệnh truyền nhiễm" },
    { floor: 3, desc: "Khoa Hồi sức truyền nhiễm" },
    { floor: 4, desc: "Khoa Bệnh lây đường hô hấp" },
    { floor: 5, desc: "Khoa Bệnh lây đường tiêu hoá" },
    { floor: 6, desc: "Khoa Bệnh lây đường máu" },
  ],
  B12: [{ floor: null, desc: "Nhà để xe nhân viên" }],
  B13: [{ floor: null, desc: "Lối vào Nhà lưu trú", nodeId: "B13_LOIVAO" }],
  B14: [{ floor: null, desc: "Nhà thể thao đa năng" }],
  B15: [{ floor: null, desc: "Nhà thể thao đa năng" }],
  B16: [{ floor: null, desc: "Nhà tang lễ", nodeId: "B16" }],
};

/**
 * KHUNG DỮ LIỆU CHO LỐI ĐI TRONG NHÀ (chưa có dữ liệu thật - để trống)
 * --------------------------------------------------------------------
 * Khi có bản vẽ mặt bằng nội thất (ảnh hoặc CAD) của 1 toà/1 tầng cụ thể, thêm 1 mục vào đây
 * theo đúng cấu trúc mẫu bên dưới (đã comment). App sẽ dùng CHUNG thuật toán Dijkstra và cách
 * vẽ SVG-đè-lên-ảnh-nền như bản đồ tổng thể — chỉ khác ảnh nền + toạ độ là của riêng tầng đó.
 *
 * Cấu trúc mẫu (bỏ comment và điền số liệu thật khi có bản vẽ):
 *
 * const INDOOR_PLANS = {
 *   // key = id của cửa vào (isEntrance) hoặc khu nhà, ví dụ "B08_SANHA"
 *   B08_SANHA: {
 *     floor: 1,                          // bản vẽ này là của tầng mấy
 *     image: "data:image/jpeg;base64,...", // ảnh mặt bằng nội thất tầng đó (nhúng base64 như map-image.js)
 *     imageWidth: 800,
 *     imageHeight: 600,
 *     nodes: [
 *       // toạ độ đo theo ẢNH NỘI THẤT này (hệ toạ độ riêng, không liên quan map tổng thể)
 *       { id: "B08_SANHA_LOBBY", name: "Sảnh vào", x: 40, y: 300 },
 *       { id: "B08_SANHA_STAIR", name: "Cầu thang", x: 200, y: 150 },
 *       { id: "B08_KHOA_CAPCUU_C1", name: "Khoa Cấp cứu C1-3", x: 400, y: 120, isDestination: true },
 *     ],
 *     edges: [
 *       { from: "B08_SANHA_LOBBY", to: "B08_SANHA_STAIR" },
 *       { from: "B08_SANHA_STAIR", to: "B08_KHOA_CAPCUU_C1" },
 *     ],
 *   },
 * };
 *
 * Hiện KHÔNG có dữ liệu này (giữ để trống), vì file sơ đồ gốc T1.pdf không có bản vẽ nội thất.
 */
const INDOOR_PLANS = {};
