# Kết quả kiểm thử — 23/09/2026

## Phạm vi

Sửa code trên bộ file đính kèm; không triển khai lên máy chủ. Không tự nối B09/B14/B15 theo yêu cầu của chủ dữ liệu.

## Đã kiểm tra và đạt

- 178 ID/tên/tọa độ/số tầng và 226 cạnh khớp dữ liệu gốc. Chỉ đổi cờ phạm vi của B09/B14/B15 và cờ trung chuyển của ba lối vào được ghi trong CHANGELOG.
- 9 nhóm test lõi qua bằng Node.js 24.19.0.
- 71 vị trí QR × 42 mục đích được hỗ trợ = 2.982 tổ hợp: 2.952 tuyến hợp lệ, 30 trùng điểm đầu/cuối, 0 tổ hợp không có tuyến.
- Không tuyến nào dùng điểm isTransitPoint:false làm trung chuyển.
- Chiều rẽ trái/phải đúng hệ tọa độ ảnh; mọi cạnh đổi tầng được kiểm tra cả hai chiều.
- ID lạ/prototype bị từ chối; dữ liệu lỗi dừng khởi tạo có thông báo; hỗ trợ cạnh một chiều và cạnh bị tắt.
- Tìm kiếm không dấu, giữ query URL hợp lệ, thay node cũ, bỏ fragment, chặn URL không thuộc HTTP(S) hoặc có tài khoản nhúng.
- Toàn bộ đường dẫn script/CSS trong HTML có file tương ứng. Ảnh gốc và ảnh nhúng cùng 1000 × 1298.

## DOM mô phỏng

Chạy bằng jsdom 26.1.0, @napi-rs/canvas 0.1.100, jsQR 1.4.0. Canvas tạo ảnh thật; sự kiện tải ảnh được mô phỏng sau khi giải mã bằng thư viện ảnh.

- Có đúng 42 nút đích và 71 lựa chọn vị trí (cộng một mục chọn trống).
- Chọn đích trùng vị trí không lỗi, hiển thị một marker trên SVG.
- Chọn Cấp cứu qua từ khóa `cap cuu`, vẽ được các đoạn tuyến.
- Chuyển tab ban đầu đúng tầng xuất phát; đi từ tầng 3 xuống tầng 2 có câu “xuống Tầng 2”.
- Đổi vị trí xóa node cũ khỏi URL; phóng to thay đổi đúng mức.
- QR B09/B14/B15 và ID không hợp lệ hiển thị màn hình chọn vị trí cùng thông báo.
- Thiếu map-data.js hiển thị lỗi khởi tạo; thiếu thư viện QR không cho in.
- Tạo đủ 71 ảnh QR, chờ ảnh sẵn sàng trước khi cho in.
- Nội dung hai dòng dưới QR đúng yêu cầu; mã vị trí/tọa độ có lớp no-print.
- Sửa URL xóa ảnh QR cũ và khóa in; URL javascript bị từ chối.
- Một ảnh QR PNG được giải mã độc lập thành đúng `https://example.org/index.html?lang=vi&node=G_1A`.
- Không có lỗi JavaScript trong các luồng hợp lệ đã chạy. Các tình huống cố tình thiếu dữ liệu báo lỗi đúng thiết kế.

## Giới hạn kiểm chứng

- Chromium không có sẵn; tải browser không thành công trong môi trường này. Chưa xác minh bố cục trực quan, việc thực thi CSP, phân trang in hoặc hành vi iOS/Android trên trình duyệt thật.
- Chưa quét bản QR giấy hoặc xác minh chất lượng máy in; việc giải mã PNG không thay thế bước này.
- Chưa xác minh lối đi, cửa mở/đóng, tầng, quyền trung chuyển và khả năng tiếp cận ngoài thực địa. Giữ nguyên topology gốc không có nghĩa là chứng nhận dữ liệu đó đúng thực tế.
- Bản vẽ nội thất chưa có; tầng trên vẫn hiển thị minh họa trên sơ đồ tổng thể kèm thông báo giới hạn.

Trước khi phát hành cho bệnh nhân: chạy thử Chrome/Edge/Safari, kiểm tra mobile và xem trước bản in A4, quét QR giấy, kiểm tra tuyến tại bệnh viện. Bộ code đã sửa các lỗi xác nhận được, nhưng báo cáo này không thay thế nghiệm thu thực địa.
