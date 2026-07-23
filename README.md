# Chỉ đường trong Bệnh viện qua Web + QR Code

## Cách hoạt động
1. Bệnh nhân mở `index.html` trên điện thoại (qua trình duyệt, không cần cài app).
2. App bật camera, quét mã QR dán trên tường → xác định vị trí hiện tại.
3. Bệnh nhân chọn khoa/phòng muốn đến.
4. App dùng thuật toán Dijkstra tính đường đi ngắn nhất trên sơ đồ, rồi hiển thị:
   - **Bản đồ SVG**: tô đậm đường đi, có thể chuyển tab nếu đi qua nhiều tầng.
   - **Danh sách chỉ dẫn văn bản**: "Đi thẳng", "Rẽ trái", "Đi thang máy lên Tầng 2"...

## Cấu trúc file
- `index.html` + `app.js` + `style.css` — app dành cho bệnh nhân.
- `admin.html` — trang tạo & in mã QR cho từng vị trí (dùng nội bộ, không cần deploy công khai).
- `map-data.js` — **file duy nhất cần chỉnh sửa** khi muốn thêm/sửa sơ đồ bệnh viện thật.

## Tuỳ chỉnh sơ đồ bệnh viện (map-data.js)
- Mỗi phòng/ngã rẽ/thang máy là một `node` với toạ độ `x, y` (đo tương đối theo bản vẽ mặt bằng thật).
- Mỗi hành lang nối 2 node là một `edge`.
- Đặt `isDestination: true` cho các phòng bệnh nhân có thể chọn làm đích (không cần cho ngã rẽ trung gian).
- Đổi tầng: tạo 2 node đại diện thang máy ở 2 tầng, nối chúng bằng 1 edge có `isElevator: true`.

## Triển khai (deploy)
Camera chỉ hoạt động khi trang chạy qua **HTTPS** (hoặc `localhost` khi test). Vài lựa chọn đơn giản, miễn phí:
- **GitHub Pages**: đẩy cả thư mục lên 1 repo GitHub, bật Pages trong Settings → có ngay link HTTPS.
- **Netlify / Vercel**: kéo-thả thư mục vào trang web của họ, deploy tự động có HTTPS.
- Test cục bộ: chạy `python3 -m http.server 8000` trong thư mục này rồi mở `http://localhost:8000`.

## In mã QR dán tường
1. Mở `admin.html` trên máy tính.
2. Mỗi thẻ hiển thị 1 mã QR ứng với 1 node trong `map-data.js` (nội dung mã QR = `id` của node, ví dụ `A2`).
3. Nhấn "In tất cả mã QR", cắt và dán đúng vị trí thực tế tương ứng.

## Có thể mở rộng thêm
- Thay thuật toán rẽ trái/phải (dựa theo góc) bằng chỉ dẫn viết tay cho từng đoạn nếu cần chính xác tuyệt đối.
- Thêm ảnh nền sơ đồ mặt bằng thật (import ảnh PNG) và chỉ vẽ node/đường đi đè lên trên bằng SVG.
- Thêm giọng nói (Web Speech API) đọc to từng bước chỉ dẫn cho người khiếm thị.
- Lưu lịch sử "vị trí quét gần nhất" bằng localStorage để bệnh nhân quay lại xem nhanh.
