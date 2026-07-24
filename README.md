# Chỉ đường trong Bệnh viện qua Web + QR Code
Bệnh viện Trung ương Quân đội 108

## Cách hoạt động
1. Mã QR dán trên tường chứa **1 đường link** dạng `https://ten-mien/index.html?node=B08`.
2. Bệnh nhân dùng camera điện thoại (hoặc app quét QR bất kỳ) quét mã, bấm vào link hiện ra.
3. Trình duyệt mở `index.html` và **tự nhận vị trí hiện tại** từ link — không cần mở camera quét lại trong app.
4. Bệnh nhân gõ tìm khoa/phòng muốn đến (vd: "cấp cứu", "sản", "N1A"...).
5. App dùng thuật toán Dijkstra tính đường ngắn nhất, hiển thị:
   - **Bản đồ**: ảnh sơ đồ mặt bằng thật, có vẽ đè đường đi (xanh), điểm xuất phát (chấm xanh lá),
     điểm đến (chấm đỏ).
   - **Danh sách chỉ dẫn văn bản**: "Đi thẳng", "Rẽ trái", "Lên Tầng 2"...

Nếu ai đó mở thẳng `index.html` mà không qua link QR (không có `?node=...`), app hiện màn hình dự phòng
cho phép chọn vị trí thủ công từ danh sách.

## Cấu trúc file
- `index.html` + `app.js` + `style.css` — app dành cho bệnh nhân.
- `admin.html` — trang tạo & in mã QR cho từng vị trí (dùng nội bộ, không cần deploy công khai).
- `map-data.js` — **file chính cần chỉnh sửa** khi muốn thêm/sửa sơ đồ bệnh viện (khu nhà, khoa/phòng, lối đi).
- `map-image.js` — ảnh nền sơ đồ mặt bằng thật, đã nhúng sẵn dạng base64 (không phải file ảnh rời).

## Mã QR chứa link, không phải mã trần
- Mở `admin.html` trên máy tính → mỗi thẻ hiển thị 1 mã QR cho 1 khu nhà/cổng. Ô "Địa chỉ trang
  index.html sau khi deploy" đã đặt sẵn giá trị `https://tuyetrojmuaha.github.io/hospital-navigation/index.html`
  — nếu đổi domain/tên repo sau này, sửa lại dòng `guessedBaseUrl` trong `admin.html` (hoặc gõ đè trực
  tiếp vào ô đó trước khi in).
- Nhấn "In tất cả mã QR", cắt và dán đúng vị trí thực tế tương ứng.

## Ảnh nền sơ đồ mặt bằng thật (đã nhúng sẵn, không cần upload file riêng)
- Ảnh gốc từ file PDF sơ đồ đã được chuyển thành ảnh, nén, và **nhúng thẳng dạng base64** vào
  `map-image.js` (biến `MAP_BACKGROUND_DATA_URL`). File `map-data.js` tham chiếu tới biến này qua
  `MAP_IMAGE.src`.
- Lý do nhúng thay vì để file `.jpg` riêng: một số cách upload (kéo-thả qua giao diện web GitHub)
  không giữ đúng cấu trúc thư mục con, khiến ảnh bị lỗi đường dẫn 404 và không hiển thị. Nhúng base64
  vào JS đảm bảo ảnh LUÔN đi kèm code, không thể bị thiếu file khi deploy.
- **Bắt buộc nạp `map-image.js` TRƯỚC `map-data.js`** trong cả `index.html` và `admin.html` (đã cấu
  hình sẵn) — nếu không sẽ báo lỗi "MAP_BACKGROUND_DATA_URL is not defined".
- SVG được vẽ đè lên đúng ảnh này (`viewBox` = kích thước ảnh: 1000×1298), nên toạ độ x,y trong
  `map-data.js` phải đo theo đúng ảnh gốc. Chỉ điểm/đoạn đường thuộc lộ trình mới vẽ nổi bật, để
  không che các chi tiết khác của sơ đồ gốc.
- Muốn đổi ảnh nền khác:
  ```bash
  python3 -c "
  from PIL import Image
  im = Image.open('anh-goc.jpg').convert('RGB')
  im = im.resize((1000, int(im.height * 1000 / im.width)), Image.LANCZOS)
  im.save('resized.jpg', quality=85, optimize=True)
  "
  python3 -c "
  import base64
  with open('resized.jpg','rb') as f: data = f.read()
  b64 = base64.b64encode(data).decode('ascii')
  with open('map-image.js','w') as f:
      f.write('const MAP_BACKGROUND_DATA_URL = \"data:image/jpeg;base64,' + b64 + '\";')
  "
  ```
  Rồi cập nhật `MAP_IMAGE.width` / `MAP_IMAGE.height` trong `map-data.js` cho khớp kích thước ảnh mới.

## Đường đi bám theo đúng các mũi tên đỏ (lối đi được phép qua) trên sơ đồ gốc
- Trên ảnh sơ đồ gốc có các hàng mũi tên đỏ nhỏ, ngược chiều nhau (↕) — đây là ký hiệu chính thức
  đánh dấu chỗ được phép đi bộ băng qua giữa các khu nhà/bãi xe/sân vườn.
- `map-data.js` giờ có 18 **waypoint** (`isWaypoint: true`, id bắt đầu `P_...`) đặt **đúng tại các
  hàng mũi tên này** (xác định bằng cách dò màu đỏ trên ảnh gốc độ phân giải cao rồi quy đổi toạ độ
  về hệ 1000×1298) — không phải ước lượng bằng mắt như bản trước.
- Mỗi khu nhà/cổng chỉ nối tới waypoint/điểm băng qua gần nhất, nên lộ trình luôn đi qua đúng các lối
  đi được đánh dấu, không cắt xuyên qua nhà khác.
- Waypoint không hiện trong danh sách tìm kiếm, không có mã QR — chỉ dùng để dẫn đường.
- Vẫn có thể còn sai lệch nhỏ ở vài điểm ít mũi tên rõ (đã dùng ước lượng vị trí trung tâm hợp lý cho
  các đoạn đó). Muốn tinh chỉnh thêm: mở ảnh gốc phóng to, đối chiếu từng hàng mũi tên, sửa lại x,y
  của waypoint tương ứng trong `map-data.js`.
- Muốn thêm 1 lối đi mới: thêm 1 node có `isWaypoint: true` tại đúng vị trí mũi tên, rồi thêm edge nối
  nó với waypoint lân cận và/hoặc khu nhà cần nối — không cần khai báo `weight` vì hệ thống tự tính
  theo khoảng cách toạ độ.

## Tuỳ chỉnh sơ đồ bệnh viện (map-data.js)
- Mỗi khu nhà/cổng là một `node` với toạ độ `x, y` đo theo đúng ảnh nền (`map-image.js`).
- Mỗi lối đi nối 2 mốc là một `edge` — trọng số (khoảng cách) **tự động tính** theo toạ độ x,y,
  không cần khai báo tay (trừ khi muốn ép theo số đo thực tế bằng cách thêm `weight: <số>`).
- `BUILDING_DIRECTORY` liệt kê khoa/phòng theo từng tầng của mỗi khu nhà — đây là danh sách hiện ra
  khi bệnh nhân tìm kiếm đích đến.
- Đặt `isDestination: true` cho khu nhà có thể chọn làm đích; `isGate: true` cho cổng ra vào (mốc quét QR).
- Toạ độ hiện là ước lượng bằng mắt theo ảnh sơ đồ — đủ dùng để test, nhưng nên đo lại chính xác hơn
  bằng phần mềm xem ảnh có hiển thị toạ độ con trỏ (GIMP/Photoshop/Paint) trước khi triển khai thật.

## Triển khai (deploy)
- **GitHub Pages**: đẩy cả thư mục lên 1 repo GitHub, bật Pages trong Settings → có ngay link HTTPS.
- **Netlify / Vercel**: kéo-thả thư mục vào trang web của họ, deploy tự động có HTTPS.
- Test cục bộ: chạy `python3 -m http.server 8000` trong thư mục này rồi mở `http://localhost:8000`.
- Sau khi có domain thật, nhớ vào lại `admin.html`, kiểm tra ô địa chỉ, rồi in lại QR nếu domain thay đổi.

## Có thể mở rộng thêm
- Thay thuật toán rẽ trái/phải (dựa theo góc) bằng chỉ dẫn viết tay cho từng đoạn nếu cần chính xác tuyệt đối.
- Thêm giọng nói (Web Speech API) đọc to từng bước chỉ dẫn cho người khiếm thị.
- Lưu lịch sử "vị trí quét gần nhất" bằng localStorage để bệnh nhân quay lại xem nhanh.
