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

## Đích đến chi tiết theo từng khu chức năng cụ thể
- Nhiều khu nhà giờ có **nhiều đích đến chi tiết** thay vì chỉ 1 điểm chung chung, theo đúng toạ độ
  và tên khu chức năng thật bạn cung cấp:
  - **Nhà N1A (B01)**: 5 khu ở Tầng 1 (Nhà thuốc số 2, Khu đăng ký khám dịch vụ, Khu đăng ký khám
    BHYT, Khu hướng dẫn, Khu thanh toán) nối thành 1 hành lang, cộng thêm Tầng 2-4.
  - **Nhà N1B (B02)**: Khu Xquang + Khu MRI ở Tầng 1, cộng thêm Tầng 2-4.
  - **Nhà N2A (B03)**: Khu cấp phát thuốc BHYT ở Tầng 1, cộng thêm Tầng 2-4.
  - **Nhà N3 (B06)**: Khu Xquang/điện tim/siêu âm ở Tầng 1 (có cả thang máy + thang bộ riêng), cộng
    thêm Tầng 2-4.
  - **Toà Tháp đôi (B08)**: xây lại hoàn toàn với 10 điểm chi tiết thay cho 4 cửa vào ước lượng cũ —
    Khu Cấp cứu, Khu khám A, Khu khám B, Nhà thuốc số 1, Nhà Nội khoa, Nhà Ngoại khoa, Khối Cận lâm
    sàng, Sảnh chính, cùng 2 điểm thang máy riêng của Nhà Nội khoa/Ngoại khoa.
  - **Nhà Chỉ huy cơ quan (B10)**: tách thành Sảnh A (Ban Giám đốc) và Sảnh B (Khối cơ quan).
  - **Nhà lưu trữ (B13)**: có lối vào cụ thể thay vì chỉ điểm tâm nhà.
- Mỗi mục trong `BUILDING_DIRECTORY` giờ có thể có thêm field `nodeId` trỏ đúng tới node chi tiết đó —
  khi tìm kiếm ra kết quả, app tính đường đi thẳng tới đúng điểm đó (không chỉ dừng ở cửa toà nhà chung).
- Việc thêm/sửa các điểm chi tiết khác làm tương tự — xem ví dụ thật ngay trong `map-data.js` (tìm theo
  các khối comment `// ===== B0...`) hoặc theo hướng dẫn tổng quát trong `CONFIG-GUIDE.md`.

## Dẫn đường LÊN TỪNG TẦNG THẬT cho 4 khu nhà có nhiều tầng (N1A, N1B, N2A, N3)
- 4 khu nhà này (B01, B02, B03, B06) mỗi nhà có 4 tầng với công năng khác nhau. Dựa theo các chấm đỏ
  bạn đánh dấu đè lên ảnh 4 toà nhà này (hàng/cột chấm = hành lang), hệ thống giờ dựng:
  - 1 "hành lang" gồm nhiều điểm nối tiếp nhau cho mỗi tầng (lặp lại cùng 1 cấu trúc ở cả 4 tầng,
    đúng như hành lang thật thường giống nhau giữa các tầng).
  - Nối các tầng với nhau bằng cạnh `isElevator: true` tại điểm cuối hành lang (đại diện vị trí
    thang máy/cầu thang), có `instruction` riêng ví dụ "Đi thang máy/cầu thang lên Tầng 2 - Nhà N1A".
  - Tầng 1 = chính node khu nhà đã có sẵn (không tạo thêm), Tầng 2-4 là node mới (id dạng
    `B01_F2_5`, `B01_F3_5`...).
- `BUILDING_DIRECTORY` mỗi mục tầng 2-4 của 4 nhà này giờ có thêm field `nodeId` trỏ đúng tới node
  hành lang của tầng đó. Khi tìm kiếm ra 1 khoa/phòng ở tầng cụ thể, app sẽ tính đường **xuyên suốt
  từ vị trí hiện tại → vào đúng cửa toà nhà → đi hết hành lang tầng 1 → lên thang máy → tới đúng tầng**,
  thay vì chỉ tính đến cửa toà nhà rồi ghi chú thêm chữ như trước.
- Test thử: từ Cổng 1B tới "Nhà N1A - Tầng 2" chỉ mất 12 bước, đi đúng qua hành lang tầng 1 rồi lên
  thẳng tầng 2 — xem chi tiết cách test trong mục "Triển khai" bên dưới.
- Muốn áp dụng cách này cho khu nhà khác: xem hướng dẫn chi tiết + ví dụ code trong `CONFIG-GUIDE.md`
  (mục "Đi từ TẦNG này sang TẦNG kia"), giờ đã có ví dụ thật (B01/B02/B03/B06) để tham khảo trực tiếp
  trong `map-data.js` thay vì chỉ đọc hướng dẫn suông.

## Đường đi bám theo đúng các chấm đỏ do bạn tự đánh dấu trên ảnh
- Thay vì tự ước lượng, giờ dùng đúng **174 điểm lối đi mặt bằng** (`isWaypoint: true`, id `P_G1..P_G174`)
  lấy từ ảnh sơ đồ mà bạn tự chấm tay (chấm đỏ = lối đi, chấm xanh = đích đến).
- Cách xử lý: so khác biệt pixel giữa ảnh gốc và ảnh đã chấm để tìm đúng vị trí từng chấm (loại bỏ hết
  mũi tên/chữ đỏ có sẵn trên sơ đồ gốc), phân loại chấm nằm trên nền trắng/khe trống (lối đi mặt bằng)
  và chấm đè lên ảnh toà nhà, rồi tự động nối các điểm gần nhau (bán kính 30px) thành 1 mạng lưới.
- Mỗi khu nhà/cổng được nối tới điểm mặt bằng **gần nhất** trong mạng lưới này — đã kiểm tra toàn bộ
  198 node đều nằm trong **1 thành phần liên thông duy nhất** (không còn khu nào bị "mắc kẹt" không tìm
  được đường).
- Vì mạng lưới rất chi tiết (nhiều điểm sát nhau), lời chỉ dẫn tự động **gộp các đoạn đi thẳng liên tiếp**
  lại thành 1 dòng, chỉ tách dòng mới khi thực sự rẽ/đổi tầng/tới đích — nếu vẫn thấy chỉ dẫn hơi dài ở
  vài lộ trình, có thể nới thêm ngưỡng góc "đi thẳng" trong hàm `turnLabel()` (`app.js`, hiện là 40°).
- **41 chấm đỏ nằm đè lên ảnh toà nhà** (theo bạn mô tả là lối đi cho các tầng khác nhau) chưa được đưa
  vào vì không có cách phân biệt chấm nào ứng với tầng nào (cùng 1 màu đỏ). Muốn dùng được, cần thêm 1
  trong 2 cách: (1) báo lại thứ tự/tầng tương ứng của từng chấm, hoặc (2) lần sau đánh dấu mỗi tầng bằng
  1 màu riêng để tự động phân biệt.
- **29 chấm xanh (đích đến)** đã dò được toạ độ nhưng cũng chưa đưa vào `BUILDING_DIRECTORY` vì chưa rõ
  tên khoa/phòng ứng với từng chấm — cần bạn xác nhận/đặt tên rồi gửi lại để em thêm vào.

## Cửa vào của khu nhà (isEntrance) + giới hạn lối đi TRONG NHÀ
- **Toà Tháp đôi (B08)** là khu nhà duy nhất trong sơ đồ ghi rõ nhiều cửa vào riêng (Sảnh A, Sảnh B,
  Sảnh C + 1 lối Cấp cứu riêng). Mỗi cửa giờ là 1 node `isEntrance: true` nối vào node ảo `B08`
  (dùng để tìm kiếm/hiện tên) — Dijkstra sẽ **tự chọn cửa gần nhất** theo hướng người dùng đang đứng,
  và câu chỉ dẫn cuối sẽ nêu đúng tên cửa ("Vào toà nhà qua Sảnh A", hoặc "Vào thẳng khu Cấp cứu").
- Các khu nhà còn lại (01-07, 09-16): sơ đồ tổng thể không ghi rõ cửa chính ở đâu, nên mỗi khu nhà được
  nối tới điểm mặt bằng gần nhất trong 174 điểm mới. Nếu biết chính xác cửa chính từng nhà nằm ở đâu,
  nên tách chúng thành `isEntrance` giống B08 (đặc biệt các nhà có 2 mặt tiền/nhiều lối vào) — xem hướng
  dẫn chi tiết trong `CONFIG-GUIDE.md`.
- **Lối đi TRONG NHÀ (hành lang, cầu thang, phòng cụ thể) hiện CHƯA làm được**, vì sơ đồ gốc `T1.pdf`
  chỉ là bản vẽ mặt bằng tổng thể + bảng liệt kê khoa/tầng bằng chữ, không có bản vẽ nội thất từng
  tầng. Chỉ dẫn hiện dừng ở mức "vào toà nhà qua cửa nào, lên tầng mấy".

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
