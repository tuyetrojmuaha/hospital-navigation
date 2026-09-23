# Kết quả kiểm thử — 2026-09-23.2

## Phạm vi

Sửa code trên bộ file đính kèm; không triển khai lên máy chủ. Không tự nối B09/B14/B15 theo yêu cầu của chủ dữ liệu.

## Đã kiểm tra và đạt

- 178 ID/tên/tọa độ/số tầng và 226 cạnh khớp dữ liệu gốc. Chỉ đổi cờ phạm vi của B09/B14/B15 và cờ trung chuyển của ba lối vào được ghi trong CHANGELOG.
- 14 nhóm test lõi qua bằng Node.js 24.19.0.
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
- Nội dung hai dòng dưới QR đúng yêu cầu; không có dòng mã vị trí/tọa độ hoặc link thử trong thẻ.
- Sửa URL xóa ảnh QR cũ và khóa in; URL javascript bị từ chối.
- Một ảnh QR PNG được giải mã độc lập thành đúng `https://example.org/index.html?lang=vi&node=G_1A`.
- Không có lỗi JavaScript trong các luồng hợp lệ đã chạy. Các tình huống cố tình thiếu dữ liệu báo lỗi đúng thiết kế.

## Giới hạn kiểm chứng

- Chromium không có sẵn; tải browser không thành công trong môi trường này. Chưa xác minh bố cục trực quan, việc thực thi CSP, phân trang in hoặc hành vi iOS/Android trên trình duyệt thật.
- Chưa quét bản QR giấy hoặc xác minh chất lượng máy in; việc giải mã PNG không thay thế bước này.
- Chưa xác minh lối đi, cửa mở/đóng, tầng, quyền trung chuyển và khả năng tiếp cận ngoài thực địa. Giữ nguyên topology gốc không có nghĩa là chứng nhận dữ liệu đó đúng thực tế.
- Bản vẽ nội thất chưa có; tầng trên vẫn hiển thị minh họa trên sơ đồ tổng thể kèm thông báo giới hạn.

Trước khi phát hành cho bệnh nhân: chạy thử Chrome/Edge/Safari, kiểm tra mobile và xem trước bản in A4, quét QR giấy, kiểm tra tuyến tại bệnh viện. Bộ code đã sửa các lỗi xác nhận được, nhưng báo cáo này không thay thế nghiệm thu thực địa.

## Kiểm thử bổ sung bản hoàn thiện

- Từ chối các kiểu sai (chuỗi, số, null, undefined) cho 7 cờ node và 3 cờ cạnh; vẫn nhận boolean true/false và thuộc tính bỏ trống.
- Đường cong đổi hướng nhỏ liên tiếp 0°/30°/60°/90° được chỉ dẫn đúng bên; kiểm tra chiều ngược và vượt biên ±180°.
- Nhiễu góc nhỏ xen kẽ không sinh cảnh báo cong; rẽ gấp trong đoạn chữ S không bị góc tích lũy che mất.
- Tuyến G_1A đến B08_KHAMB trong dữ liệu thật có chỉ dẫn cong.
- So sánh độc lập với Floyd–Warshall: chi phí cả 2.982 tổ hợp đều khớp trong sai số 1e-8.
- DOM mô phỏng: sự kiện lỗi ảnh ẩn cả khung bản đồ và nút zoom; đổi đích không hiện lại; sự kiện tải ảnh thành công phục hồi đúng cả hai.

Các giới hạn trình duyệt thật, CSP, bản in giấy và kiểm chứng thực địa ở trên vẫn áp dụng. Không coi kết quả mô phỏng là chứng nhận hoạt động trên mọi thiết bị.

## Sửa giao diện 2026-09-23.4

- Các thẻ đích giữ chiều cao nội dung, không co trong danh sách cuộn. Đã kiểm tra thuộc tính CSS, chưa có kiểm chứng bố cục bằng browser thật trong môi trường này.
- Chọn vị trí bệnh nhân chỉ hiện tên; value vẫn là ID.
- Cả 71 thẻ QR không còn dòng mã/tầng/tọa độ và link thử; PNG mẫu vẫn giải mã ra đúng link và node.
