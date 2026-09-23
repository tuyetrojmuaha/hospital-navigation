# Chỉ đường trong Bệnh viện

Bản sửa ngày 23/09/2026. Ứng dụng tĩnh, không cần backend hoặc cơ sở dữ liệu.

## Phạm vi đã thống nhất

- Giữ nguyên 178 điểm và 226 cạnh cùng tọa độ từ bộ dữ liệu gửi kèm.
- **B09, B14, B15 cố ý không kết nối**. Giữ các điểm và danh mục của chúng trong dữ liệu nhưng đặt `routingEnabled: false`; không xuất hiện trong danh sách đích, chọn vị trí hoặc in QR. Link QR cũ trỏ tới các điểm này hiển thị thông báo ngoài phạm vi.
- Bốn waypoint chưa nối P_G61/P_G55/P_G65/P_G67 được giữ nguyên. Công cụ kiểm tra báo cảnh báo; ứng dụng không đưa chúng vào vị trí chọn/in.
- Có 71 vị trí QR được hỗ trợ, 42 mục đích đến (45 mục trong dữ liệu, trừ 3 mục ngoài phạm vi).
- Không tự thêm lối đi hoặc suy đoán kết nối thực địa.
- Các lối vào B12_CUA1/B12_CUA2/B13_LOIVAO được đánh dấu có thể đi qua. Mọi cờ trung chuyển khác giữ theo dữ liệu người dùng.

## Chạy trên máy Windows

1. Giải nén toàn bộ ZIP vào một thư mục. Giữ nguyên tên file bên trong, không thêm `(1)` hoặc hậu tố ngày tháng.
2. Mở Terminal/PowerShell tại thư mục có `index.html`.
3. Chạy:

```powershell
py -m http.server 8000
```

Nếu máy dùng lệnh `python` thay cho `py`:

```powershell
python -m http.server 8000
```

4. Mở `http://localhost:8000/index.html?node=G_1A`.
5. Mở `http://localhost:8000/admin.html` để thử tạo QR. QR chứa localhost chỉ để kiểm tra trên cùng thiết bị; phải nhập địa chỉ HTTPS thật trước khi in để dùng tại bệnh viện.

Nên dùng máy chủ HTTP cục bộ thay vì mở HTML trực tiếp để tránh khác biệt chính sách `file://` giữa các trình duyệt.

## Triển khai

Đưa các file web sau cùng một thư mục gốc của dịch vụ lưu trữ tĩnh có HTTPS:

- index.html, app.js, style.css
- navigation-core.js
- map-image.js, map-data.js
- admin.html, admin.js, config.js, vendor/ (nếu cần công cụ in QR trên máy chủ)

`hospital-floorplan.jpg` là ảnh tham khảo gốc, không bắt buộc cho runtime vì ảnh đang nhúng trong map-image.js.
`tests/`, README.md, CONFIG-GUIDE.md, CHANGELOG.md, TEST-REPORT.md không cần đưa lên web.

Không có thao tác đăng nhập hoặc ghi dữ liệu từ admin.html: đây chỉ là công cụ tạo QR. `noindex` không phải bảo vệ truy cập. Nếu dùng riêng nội bộ, giữ admin.html/admin.js/config.js/vendor trên máy quản trị hoặc đặt sau cơ chế truy cập của máy chủ. Trang bệnh nhân không phụ thuộc các file admin này.

CSP khai báo trong HTML chỉ cho script/style cục bộ và ảnh cục bộ/data. Không có phân tích hành vi, CDN runtime, script Kaspersky hoặc gửi dữ liệu ra bên ngoài. Nếu quản lý được HTTP headers, cấu hình thêm `X-Content-Type-Options: nosniff` và `Content-Security-Policy: frame-ancestors 'none'` ở máy chủ. Chỉ cấu hình HSTS khi tên miền đã vận hành HTTPS đầy đủ.

Khi cập nhật: tải lên đồng bộ toàn bộ file, tăng chuỗi phiên bản `v=20260923-1` trong cả hai HTML (và APP_CONFIG.release để ghi nhận phiên bản). Nên phục vụ HTML với cache cần tái xác thực để trình duyệt nhận phiên bản mới. Không thêm service worker trong bản này để tránh dữ liệu lối đi cũ bị giữ ngầm. Không cam kết tải lại trang khi mất mạng.

## Tạo và in QR

1. Vào admin.html. Địa chỉ tự lấy index.html cùng thư mục nếu mở trên HTTP(S); khi mở file cục bộ dùng giá trị trong config.js.
2. Kiểm tra hoặc thay bằng URL HTTPS thật. Có thể giữ query khác; node được thay bằng đúng ID và fragment bị bỏ.
3. Chọn tất cả hoặc một vị trí. ID/tọa độ trên màn hình giúp phân biệt các vị trí trùng tên.
4. Bấm Tạo mã QR, đợi nút In mã đã tạo bật.
5. Quét thử link bằng điện thoại và kiểm tra vị trí. In A4, tắt header/footer tự thêm của trình duyệt, kiểm tra bản xem trước.
6. Dán đúng vị trí. Với các điểm có tên trùng, in từng vị trí và đối chiếu ID/tọa độ trước khi dán.

Bản in chỉ có mã QR, “Quét mã QR để tìm đường đi trong Bệnh viện” và “Vị trí hiện tại: …”. ID/tọa độ và link thử không in ra giấy. Mã có vùng trắng xung quanh; không cắt sát ô vuông QR. Nếu thay tên miền hoặc đổi ID của điểm đã in, phải xử lý chuyển hướng hoặc in lại mã.

## Giới hạn phải xác minh ngoài thực địa

- Dữ liệu tầng trên dùng cùng sơ đồ khuôn viên. Không có bản vẽ nội thất đã kiểm chứng; giao diện nêu rõ đây là minh họa.
- Tại các khoa B11 chưa có node tầng riêng, tuyến dừng ở khu nhà và nhắc hỏi nhân viên để lên tầng.
- Cầu thang/thang máy được phân biệt khi dữ liệu có thông tin chắc chắn; cạnh ghi chung được gọi là “lối chuyển tầng”. Chưa cung cấp chế độ tuyến xe lăn vì chưa có dữ liệu độ dốc, bậc và khả năng tiếp cận của toàn tuyến.
- QR là vị trí xuất phát cố định, không phải định vị trực tiếp. Muốn đổi vị trí, quét lại QR hoặc chọn thủ công.
- Chỉ dẫn rẽ dựa trên hình học tuyến; bước đầu yêu cầu đối chiếu sơ đồ/biển tại chỗ, không biết hướng người đang quay mặt.
- Một đường tính được trên đồ thị chưa chứng minh được đường thực tế đang mở. Kiểm tra cửa, giờ mở cửa, quyền đi qua các khu và tuyến tại bệnh viện trước khi phát hành cho bệnh nhân.

## Kiểm thử logic

Cài Node.js nếu muốn tự chạy kiểm thử (không cần Node.js để phục vụ website tĩnh):

```powershell
node --test tests/core.test.cjs
```

Bộ test kiểm tra phạm vi loại trừ, toàn bộ cặp vị trí/đích được hỗ trợ, rẽ trái/phải, đổi tầng hai chiều, ID sai, tìm kiếm không dấu, URL QR và dữ liệu lỗi. Kết quả chạy trong môi trường sửa code được ghi trong TEST-REPORT.md.

Kiểm thử DOM mô phỏng và giải mã QR độc lập (tùy chọn, cần Node.js >= 20):

```powershell
npm install
npm run test:dom
```

Các gói trong package.json chỉ phục vụ kiểm thử, không được tải bởi trang web. DOM mô phỏng không thay thế kiểm thử bố cục/CSP/bản in trên trình duyệt thật.
