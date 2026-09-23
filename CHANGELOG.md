# Sửa thẻ QR 2026-09-23.4

- Bỏ hai dòng chữ nhỏ mã/tầng/tọa độ và “Mở thử vị trí” khỏi thẻ QR trên trang admin.
- Thẻ chỉ giữ QR, câu hướng dẫn quét và tên vị trí.
- Gồm cả sửa chồng chữ và bỏ ID khỏi danh sách chọn vị trí của bản 2026-09-23.3.

# Sửa giao diện 2026-09-23.3

- Các thẻ đích đến không bị flexbox co chiều cao; tên khoa/phòng và dòng khu nhà/tầng luôn nằm trong thẻ, tên dài tự xuống dòng.
- Danh sách chọn vị trí trên index.html chỉ hiển thị tên; ID vẫn giữ trong value để tìm đường và đọc QR.
- Tăng phiên bản tải tài nguyên lên 20260923-3 để cập nhật CSS/JS trên trình duyệt.

# Hoàn thiện 2026-09-23.2

- Sửa ẩn bản đồ lỗi bằng phần tử HTML bao ngoài, không gán hidden trên SVGElement.
- Ẩn bản đồ/zoom trước khi nền tải xong; giữ ẩn khi đổi đích trong trạng thái lỗi; mở lại khi ảnh phục hồi.
- Nhận diện góc tích lũy cho đoạn cong, giữ ưu tiên rẽ gấp tại điểm và chống nhầm do nhiễu góc nhỏ hoặc qua biên ±180°.
- Từ chối mọi cờ boolean sai kiểu ở cả node và edge trước khi cho dùng đồ thị.
- Thêm 5 nhóm test lõi và test DOM lỗi/phục hồi ảnh; tổng 14 nhóm test lõi.
- Đưa đối chiếu Floyd–Warshall cho 2.982 tổ hợp vào test hồi quy.
- Tăng phiên bản query tài nguyên trong hai HTML lên 20260923-2.
- Giữ nguyên 178 node, 226 cạnh, phạm vi loại trừ B09/B14/B15 và 71 QR.

# Thay đổi 23/09/2026

- Giữ nguyên tập ID, tọa độ và cạnh gốc. B09/B14/B15 được đánh dấu ngoài phạm vi theo yêu cầu.
- Loại các khu ngoài phạm vi khỏi lựa chọn/QR; QR cũ hiển thị thông báo rõ ràng.
- Tách core dùng chung, dùng Map để không nhận nhầm ID từ prototype.
- Kiểm tra node, cạnh, trọng số, tầng, ảnh và tham chiếu danh mục khi khởi tạo.
- Cấm trung chuyển qua điểm bị hạn chế, bỏ hình phạt 5000 và cơ chế đi xuyên khi không còn đường.
- Đánh dấu ba node lối vào B12_CUA1/B12_CUA2/B13_LOIVAO được trung chuyển để không chặn lối vào.
- Sửa nhãn rẽ theo trục Y của ảnh; chỉ dẫn đổi tầng đúng cả hai chiều.
- Xử lý đích trùng vị trí; chọn tab bắt đầu theo tầng xuất phát.
- Tìm kiếm không dấu, theo nhiều từ, có từ khóa tầng; đủ 71 vị trí QR trong chọn thủ công.
- Dùng textContent cho dữ liệu hiển thị, thêm trạng thái lỗi/khởi tạo, hỗ trợ bàn phím và phóng to sơ đồ.
- Làm rõ sơ đồ tầng trên chỉ là minh họa; không nói người dùng đã đến khi chỉ mới tính tuyến.
- Chuẩn hóa URL QR, không nhân query node, bỏ fragment; kiểm tra giao thức và tài khoản nhúng trong URL.
- Thư viện QR 1.0.0 lưu trong vendor, giấy phép đi kèm; bỏ Kaspersky/CDN runtime.
- QR có vùng trắng; in một hoặc tất cả vị trí, chỉ cho in sau khi ảnh hoàn tất; sửa địa chỉ làm hết hiệu lực bản in cũ.
- Giữ đúng hai dòng yêu cầu dưới QR; ID/tọa độ đối chiếu không xuất hiện trên bản in.
- CSP chỉ cho tài nguyên cục bộ, không thêm theo dõi hay lưu lịch sử vị trí.
- Viết lại README và CONFIG-GUIDE theo bộ code thực tế, thêm kiểm thử hồi quy.
