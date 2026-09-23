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
