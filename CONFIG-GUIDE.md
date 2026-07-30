# Hướng dẫn tự cấu hình sơ đồ (map-data.js)

Toàn bộ sơ đồ nằm trong 1 file duy nhất: **`map-data.js`**. File này có 2 phần:
- `HOSPITAL_MAP.nodes` — danh sách MỌI điểm mốc (cổng, lối vào toà nhà, điểm băng qua, điểm trong nhà...)
- `HOSPITAL_MAP.edges` — danh sách MỌI lối đi nối 2 điểm mốc với nhau

Và 1 danh mục riêng: `BUILDING_DIRECTORY` — liệt kê khoa/phòng theo từng tầng, dùng cho ô tìm kiếm đích đến.

Đọc kỹ 3 phần dưới đây theo đúng thứ tự, vì phần sau dùng lại khái niệm ở phần trước.

---

## 1. Cấu hình LỐI VÀO của một toà nhà

Hiện tại mỗi toà nhà (`B01`, `B02`...) chỉ có **1 điểm** duy nhất đại diện cho cả toà nhà. Thực tế nhiều
toà nhà có nhiều cửa/lối vào khác nhau (cửa trước, cửa sau, cửa bên hông gần bãi xe...). Cách thêm nhiều
lối vào cho 1 toà nhà:

### Bước 1: Đổi node toà nhà thành nhiều node "lối vào"
Ví dụ Tòa Tháp đôi (`B08`) có 3 cửa thực tế: Sảnh A (chính), Sảnh B, Sảnh C. Thay vì 1 node `B08`, tách thành:

```js
{ id: "B08_A", name: "Tòa Tháp đôi - Sảnh A (cửa chính)", x: 230, y: 660, floor: 1, isDestination: true },
{ id: "B08_B", name: "Tòa Tháp đôi - Sảnh B",             x: 235, y: 780, floor: 1, isDestination: true },
{ id: "B08_C", name: "Tòa Tháp đôi - Sảnh C",             x: 210, y: 560, floor: 1, isDestination: true },
```

### Bước 2: Nối mỗi lối vào tới waypoint gần nó nhất
```js
{ from: "B08_A", to: "P_W2" },   // Sảnh A gần lối đi P_W2
{ from: "B08_B", to: "P_W3B" },  // Sảnh B gần lối đi P_W3B
{ from: "B08_C", to: "P_W1" },   // Sảnh C gần lối đi P_W1
```
Nhờ vậy, thuật toán tìm đường sẽ **tự chọn đúng cửa gần nhất** với vị trí người dùng đang đứng —
ví dụ đứng ở Cổng cấp cứu thì được dẫn vào Sảnh C, còn đứng ở Cổng số 5 thì được dẫn vào Sảnh B.

### Bước 3: Cập nhật BUILDING_DIRECTORY để trỏ đúng lối vào
`BUILDING_DIRECTORY` cần khớp `buildingId` với node thật. Nếu khoa nằm gần 1 cửa cụ thể, trỏ thẳng
vào cửa đó thay vì tên toà nhà chung:

```js
BUILDING_DIRECTORY.B08_A = [
  { floor: null, desc: "Khoa Cấp cứu C1-3" },
  { floor: null, desc: "Khu khám A, B và Viettel" },
];
BUILDING_DIRECTORY.B08_B = [
  { floor: null, desc: "Khối nhà điều trị Nội khoa" },
];
BUILDING_DIRECTORY.B08_C = [
  { floor: null, desc: "Khối nhà Cận lâm sàng" },
];
```
(Xoá `BUILDING_DIRECTORY.B08` cũ đi để tránh trùng.)

**Mẹo xác định toạ độ lối vào chính xác:** dùng đúng ảnh nền `map-image.js` (giải mã base64 ra file ảnh
để xem), hoặc đơn giản hơn — ước lượng theo vị trí cửa trên bản vẽ thật, cân đối theo toạ độ của cả
toà nhà (đã có sẵn trong `map-data.js` từ trước).

---

## 2. Cấu hình LỐI ĐI từ điểm này đến điểm kia

Đây chính là các **waypoint** (`P_...`) đã có sẵn — điểm gãy đặt tại các hàng mũi tên đỏ (↕) thật trên
sơ đồ. Cách thêm 1 lối đi mới (ví dụ phát hiện thêm 1 lối tắt giữa 2 khu nhà):

### Bước 1: Xác định toạ độ điểm mới
Toạ độ đo theo đúng hệ 1000×1298 (khớp với ảnh nền). Nếu bạn có ảnh gốc, mở bằng phần mềm xem ảnh có
thước đo pixel (GIMP/Photoshop/Paint), rê chuột tới đúng vị trí, đọc toạ độ (x, y).

### Bước 2: Thêm node waypoint mới
```js
{ id: "P_TAT1", name: "Lối tắt giữa nhà N2A và N3", x: 430, y: 480, floor: 1, isWaypoint: true },
```
`isWaypoint: true` đảm bảo điểm này KHÔNG hiện trong danh sách tìm kiếm đích đến.

### Bước 3: Nối waypoint mới với 1-2 waypoint hoặc khu nhà lân cận
```js
{ from: "P_C1",  to: "P_TAT1" },
{ from: "P_TAT1", to: "B06" },
```
Không cần khai báo `weight` — hệ thống tự tính bằng khoảng cách toạ độ (xem `euclideanDistance` trong
`app.js`). Chỉ khai báo `weight` thủ công khi khoảng cách thật khác nhiều so với đường chim bay (ví dụ
lối đi zíc-zắc dài hơn nhiều so với đường thẳng).

### Xoá 1 lối đi không còn đúng
Xoá hẳn dòng `edge` tương ứng trong mảng `edges`. Không cần sửa gì thêm — thuật toán Dijkstra sẽ tự
động không dùng lối đi đó nữa.

### Kiểm tra lối đi mới có hoạt động không
Mở `index.html` bằng trình duyệt (`python3 -m http.server 8000` rồi vào `localhost:8000`), chọn vị trí
thủ công ở 1 trong 2 đầu lối đi mới, chọn đích ở đầu kia, xem lộ trình có đi qua waypoint mới không.

---

## 3. Cấu hình đi từ TẦNG này sang TẦNG kia (thang máy / cầu thang)

Hiện tại toàn bộ node đều có `floor: 1` vì đây là bản đồ khuôn viên ngoài trời (nhìn từ trên xuống, tất
cả toà nhà đều "ở tầng 1" theo nghĩa mặt bằng tổng thể). `BUILDING_DIRECTORY` chỉ liệt kê tầng bên
**trong nội bộ 1 toà nhà** dưới dạng text (ví dụ "Tầng 2: Các phòng khám"), chưa vẽ được đường đi bên
trong.

Khi có bản vẽ mặt bằng NỘI THẤT từng tầng (ví dụ file ảnh riêng cho Tầng 1, Tầng 2, Tầng 3 của 1 toà
nhà), làm theo các bước sau để mở rộng:

### Bước 1: Thêm node cho mỗi điểm trong nội thất, đúng số tầng thật
```js
{ id: "B01_T1_SANH", name: "Sảnh chờ - Tầng 1",        x: 120, y: 90,  floor: 1, isDestination: false },
{ id: "B01_T1_THANGMAY", name: "Thang máy - Tầng 1",   x: 200, y: 90,  floor: 1, isDestination: false },
{ id: "B01_T2_THANGMAY", name: "Thang máy - Tầng 2",   x: 200, y: 90,  floor: 2, isDestination: false },
{ id: "B01_T2_KHOAKHAM", name: "Các phòng khám",       x: 250, y: 140, floor: 2, isDestination: true },
```
Lưu ý: node thang máy ở Tầng 1 và Tầng 2 dùng **CHUNG toạ độ x,y** (vì cùng vị trí thực, chỉ khác tầng)
— đây là quy ước quan trọng để hệ thống hiểu đó là "cùng 1 cột thang máy, khác tầng".

### Bước 2: Nối node trong nội thất Tầng 1 với "cửa vào" của toà nhà đã có
```js
{ from: "B01", to: "B01_T1_SANH" },        // từ ngoài sân vào sảnh chờ
{ from: "B01_T1_SANH", to: "B01_T1_THANGMAY" },
```

### Bước 3: Nối 2 tầng với nhau bằng edge có `isElevator: true`
Đây là bước quan trọng nhất — nó khiến app tự sinh lời nhắc "Đi thang máy lên Tầng X":
```js
{
  from: "B01_T1_THANGMAY",
  to: "B01_T2_THANGMAY",
  isElevator: true,
  instruction: "Đi thang máy lên Tầng 2, khu vực Nhà N1A",
},
```
- `isElevator: true`: báo cho `generateDirections()` biết đây là bước đổi tầng (hiện icon 🛗, không
  tính "rẽ trái/phải" theo hướng).
- `instruction`: câu chỉ dẫn hiển thị cho bước này. Nếu bỏ trống, hệ thống tự sinh câu mặc định
  `"Di chuyển từ Tầng X lên Tầng Y"`.
- Muốn mô tả cầu thang bộ thay vì thang máy: vẫn dùng `isElevator: true` (tên cờ giữ nguyên cho đơn
  giản) nhưng đổi `instruction` thành `"Đi cầu thang bộ lên Tầng 2"`.

### Bước 4: Nối tiếp node cuối cùng ở Tầng 2 tới đích
```js
{ from: "B01_T2_THANGMAY", to: "B01_T2_KHOAKHAM" },
```

### Bước 5: Trỏ BUILDING_DIRECTORY vào đúng node đích trong nội thất
Đây là thay đổi lớn nhất về logic: hiện tại `BUILDING_DIRECTORY` gắn theo `buildingId` (ví dụ `B01`)
và chỉ thêm dòng text "Lên Tầng X" ở bước cuối. Khi có bản đồ nội thất thật, nên sửa để mỗi mục trong
`BUILDING_DIRECTORY` trỏ thẳng tới **node đích cụ thể** (`B01_T2_KHOAKHAM`) thay vì chỉ tới `buildingId`
chung — như vậy đường đi sẽ được vẽ hết toàn bộ hành trình kể cả bên trong toà nhà, không dừng ở cửa.
(Việc này cần sửa thêm 1 đoạn nhỏ trong `app.js` phần `DESTINATIONS`/`selectDestination` để dùng
`destination.nodeId` thay vì luôn luôn dùng `destination.buildingId` khi tìm đường — nếu anh làm tới
bước này, cứ nhắn lại, em sẽ sửa giúp đoạn code đó.)

### Ảnh nền cho từng tầng
Hiện `MAP_IMAGE` chỉ có 1 ảnh (bản đồ khuôn viên tổng thể). Khi có ảnh nội thất riêng từng tầng, cách
đơn giản nhất là làm thêm 1 biến ảnh riêng, ví dụ trong `map-image.js`:
```js
const FLOOR_IMAGES = {
  B01_floor1: "data:image/jpeg;base64,....",
  B01_floor2: "data:image/jpeg;base64,....",
};
```
rồi sửa `renderMap()` trong `app.js` để chọn đúng ảnh nền theo tầng đang hiển thị (thay vì luôn dùng
`MAP_IMAGE.src`). Đây cũng là phần em có thể làm giúp khi anh có ảnh nội thất thật để đưa vào.

---

## Tóm tắt quy tắc chung khi tự chỉnh sửa
| Muốn làm gì | Việc cần làm |
|---|---|
| Thêm 1 lối vào/cửa mới cho toà nhà | Thêm node `isDestination: true`, nối tới waypoint gần nhất |
| Thêm 1 lối đi/đường tắt mới | Thêm node `isWaypoint: true`, nối tới 1-2 điểm lân cận |
| Xoá 1 lối đi sai | Xoá dòng `edge` tương ứng |
| Thêm tầng trong nội thất 1 toà nhà | Thêm node theo đúng tầng thật (`floor: 2, 3...`), nối 2 tầng bằng edge `isElevator: true` |
| Đổi khoảng cách/trọng số 1 lối đi | Thêm `weight: <số>` vào edge đó (mặc định tự tính theo toạ độ) |

Sau mỗi lần sửa, luôn kiểm tra lại bằng cách mở `index.html` (`python3 -m http.server 8000`), thử vài
lộ trình liên quan tới phần vừa sửa, xem đường vẽ và lời chỉ dẫn có hợp lý không trước khi đẩy lên
GitHub.
