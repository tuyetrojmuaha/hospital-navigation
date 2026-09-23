# Cấu hình dữ liệu chỉ đường

## Các file

- map-data.js: MAP_IMAGE, HOSPITAL_MAP, BUILDING_DIRECTORY, INDOOR_PLANS.
- map-image.js: ảnh JPEG nhúng base64, 1000 × 1298.
- navigation-core.js: kiểm tra dữ liệu, xây đồ thị, tìm tuyến, chỉ dẫn và chuẩn hóa URL/tìm kiếm.
- app.js: giao diện bệnh nhân.
- admin.js và config.js: tạo/in QR và URL mặc định khi mở file cục bộ.

## Điểm mốc

```js
{ id: 'P_NEW', name: 'Hành lang công cộng', x: 300, y: 550,
  floor: 1, isWaypoint: true, isQRPoint: true }
```

ID phải duy nhất, chỉ dùng chữ ASCII, số, `_`, `-`. Tọa độ hữu hạn nằm trong ảnh; floor là số nguyên >= 1. Không đổi ID đã dán QR nếu chưa có kế hoạch cập nhật mã.

- isDestination: điểm chức năng; đủ điều kiện in QR/chọn vị trí nếu có kết nối.
- isGate: cổng; được đi qua, đủ điều kiện QR.
- isWaypoint: điểm lối đi; không tự có QR nếu thiếu isQRPoint.
- isQRPoint: đưa waypoint cần thiết vào danh sách QR và chọn thủ công.
- isTransitPoint: true cho phép đi ngang; false cấm dùng làm trung chuyển. Vẫn có thể làm điểm đầu/cuối.
- isEntrance: lối vào, được trung chuyển mặc định nếu không ghi isTransitPoint.
- routingEnabled: false để giữ dữ liệu nhưng loại khỏi dẫn đường và QR. Đang áp dụng cho B09/B14/B15 theo chủ ý, không phải lỗi cần tự nối lại.

Khi chưa khai báo isTransitPoint, điểm công cộng (waypoint/cổng/lối vào/điểm nối đổi tầng) được trung chuyển. Điểm isDestination còn lại không được trung chuyển. Mọi giá trị isTransitPoint tường minh được ưu tiên, kể cả false.

**Không đổi hàng loạt phòng chức năng thành isTransitPoint:true chỉ để tìm được đường.** Nếu tọa độ là phòng, tạo node hành lang riêng và nối phòng vào hành lang. Nếu tọa độ thật là sảnh/quầy trong không gian công cộng, xác nhận tại chỗ trước khi cho đi qua. Bản sửa này giữ các cờ có sẵn, chỉ sửa ba lối vào B12_CUA1/B12_CUA2/B13_LOIVAO.

## Lối đi

```js
{ from: 'P_NEW', to: 'P_G24' }
```

Chỉ thêm khi đoạn nối đi được ngoài thực tế; hai điểm gần nhau không chứng minh có lối đi. Mặc định cạnh hai chiều; có thể khai báo `oneWay: true` hoặc `enabled: false`. Không có cạnh trùng hoặc tự nối.

`weight` là chi phí không âm, hữu hạn. Nếu bỏ qua, dùng độ dài pixel trên ảnh; đổi tầng cộng 80 đơn vị mỗi tầng. Chi phí này không phải mét hoặc thời gian, không dùng để hiển thị khoảng cách thực tế.

```js
{ from: 'LOBBY', to: 'ROOM',
  instruction: 'Đi qua cửa bên phải tới quầy tiếp đón.',
  reverseInstruction: 'Ra khỏi quầy tiếp đón về sảnh.' }
```

Chỉ dẫn cố định có tính định hướng cần hai câu riêng. Nếu không khai báo reverseInstruction, chiều ngược dùng chỉ dẫn hình học thay vì sao chép nguyên câu chiều đi.

## Đổi tầng

```js
{ from: 'STAIR_F1', to: 'STAIR_F2', kind: 'stairs', isElevator: true }
{ from: 'LIFT_F1', to: 'LIFT_F2', kind: 'elevator', isElevator: true }
```

kind nhận `walk`, `stairs`, `elevator`, `vertical`. `vertical` dùng khi biết có lối đổi tầng nhưng chưa phân biệt phương tiện. Cờ isElevator cũ tiếp tục được hỗ trợ để không phá dữ liệu. Với dữ liệu cũ, loại di chuyển được suy ra từ instruction; các câu ghi chung không được coi chắc chắn là thang máy.

Khi hai node khác tầng, ứng dụng luôn tạo câu lên/xuống theo tầng thực tế, không dùng lại câu lên tầng cố định ở chiều ngược.

## Danh mục đích

```js
BUILDING_DIRECTORY.B01 = [
  { floor: 2, desc: 'Các phòng khám', nodeId: 'B01_F2_5' }
];
```

buildingId và nodeId phải tồn tại. Có nodeId tầng cụ thể thì floor phải khớp node. Nếu không có nodeId, ứng dụng dẫn tới node khu nhà; nếu khoa ở tầng khác thì nhắc hỏi nhân viên tại khu nhà, không vẽ đường nội thất suy đoán.

Tìm kiếm hỗ trợ không dấu, không phân biệt hoa/thường, từ khóa theo tên khoa, khu nhà và “tầng N”.

## Ảnh từng tầng

INDOOR_PLANS hiện để trống và runtime **chưa đọc cấu trúc này**. Chỉ thêm ảnh vào đó sẽ không tự hoạt động. Muốn triển khai dẫn đường nội thất thật cần thêm nhận diện khu nhà/tầng và hệ tọa độ tương ứng vào dữ liệu, bộ vẽ và kiểm thử. Không tái sử dụng tọa độ ảnh khác để vẽ lên ảnh khuôn viên.

## Kiểm tra sau khi chỉnh sửa

1. Chạy `node --test tests/core.test.cjs`. Nếu chủ ý thay đổi số node/đích/phạm vi, cập nhật các số kỳ vọng trong test sau khi kiểm tra tính đúng đắn.
2. Thử tuyến liên quan trên điện thoại, cả chiều đi và chiều về.
3. Kiểm tra cùng vị trí/đích, QR sai, các khu ngoài phạm vi, tìm kiếm không dấu.
4. Xác minh ngoài thực địa, rồi mới in QR hoặc đưa bộ dữ liệu mới lên máy chủ.
5. Tăng phiên bản cache trong cả index.html/admin.html và triển khai đồng bộ.
