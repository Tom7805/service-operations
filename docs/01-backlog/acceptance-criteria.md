# Tiêu chí chấp thuận

> File này trước đây để trống. Hiện mới có phần **Epic `NCL-09` — Biên lợi nhuận thực theo thời gian thực**.
> Nội dung là **bản nháp** do suy ra từ [api-contract.md](../04-api/api-contract.md) và bộ test đã có trong code,
> không phải từ tài liệu backlog gốc (các file trong `docs/01-backlog/` đang trống). Nhóm cần đối chiếu với
> backlog chính thức và chỉnh lại trước khi coi là bản chốt.

## Epic `NCL-09` — Biên lợi nhuận thực theo thời gian thực

Nguyên tắc chung của cả Epic: mọi số liệu **tính động** từ dữ liệu hiện hành (không lưu snapshot); dòng thiếu dữ
liệu (chưa có chi phí giờ, chưa có đơn giá, nhân sự chưa khai báo cấp bậc) **không làm lỗi cả báo cáo** mà được
đánh dấu và đếm riêng; vai trò không đủ quyền nhận `403 FORBIDDEN` và lần từ chối được ghi Nhật ký hệ thống.

### `NCL-09-CN-001` — Tính giá vốn giờ công của dự án

- Chỉ cộng các dòng giờ công `APPROVED` của dự án; dòng đảo/correction đã duyệt tính theo số giờ mang dấu.
- Mỗi dòng nhân với chi phí giờ công có `effectiveFrom` gần nhất nhưng không sau `workDate`.
- Dòng chưa có chi phí hiệu lực vẫn được trả về với `missingCostData=true` và không cộng vào `totalLaborCost`.
- `hourlyRate`, `laborCost` là dữ liệu nhạy cảm, được che theo `QTN-02`; mỗi lần đọc ghi log truy cập `COST`.
- Quyền: `VT-01`, `VT-02`, `VT-05`. Dự án không tồn tại: `404 RESOURCE_NOT_FOUND`.

### `NCL-09-CN-002` — Tính doanh thu ghi nhận của dự án

- **TC-01** Hợp đồng `TIME_AND_MATERIAL`: doanh thu = tổng (giờ × đơn giá/giờ áp dụng tại `workDate`), đơn giá/ngày quy đổi với 1 ngày công = 8 giờ, đã nhân hệ số loại hình công việc.
- **TC-02** Hợp đồng `FIXED_PRICE`: doanh thu = giá trị hợp đồng × tỷ lệ hoàn thành (số task `DONE` / tổng task, làm tròn 4 chữ số).
- **TC-03** Dòng `billable=false` bị loại khỏi doanh thu (vẫn tính vào giá vốn).
- **TC-04** Chỉ `VT-01`, `VT-05`; vai trò khác `403` và được ghi nhật ký.
- **TC-05** Mỗi lần đọc ghi log truy cập `REVENUE`.
- Dòng chưa tra được đơn giá (nhân sự chưa có cấp bậc, chưa có đơn giá hiệu lực) trả `missingRateData=true`, **không** trả HTTP 500.
- Loại hợp đồng `MAINTENANCE`, `MILESTONE`: `400 INVALID_STATE`.

### `NCL-09-CN-003` — Hiển thị biên lợi nhuận thời gian thực

- `totalCost = laborCost + projectExpenseCost + subcontractorCost` (chỉ chi phí đã duyệt).
- `grossProfit = recognizedRevenue - totalCost`; `marginRate = grossProfit / recognizedRevenue`, là `null` khi doanh thu bằng 0.
- Trả kèm `laborCostLines`, `revenueLines` để truy ngược về dòng cấu thành; hai bộ đếm `missing*EntryCount` cho phần thiếu dữ liệu.
- Giao diện: bảng chỉ số doanh thu/chi phí/lợi nhuận/tỷ suất, màu ngữ nghĩa theo dấu (lãi/lỗ), nút "Tải lại" và "Tính lại".
- Quyền: `VT-01`, `VT-02`, `VT-05`.

### `NCL-09-CN-004` — Cảnh báo dự án âm biên

- **TC-01** Mỗi lần tính lại biên, nếu `marginRate` thấp hơn ngưỡng hiện hành thì gửi thông báo trong ứng dụng cho quản lý dự án và toàn bộ Ban giám đốc (`VT-01`), không trùng người nhận.
- **TC-02** Dự án chưa phát sinh doanh thu (`marginRate = null`) và trường hợp chưa đặt ngưỡng: không cảnh báo.
- **TC-03** Chỉ `VT-01` đặt/đổi ngưỡng; `VT-02`, `VT-05` chỉ xem ngưỡng hiện hành.
- **TC-04** Mỗi lần đặt/đổi ngưỡng ghi Nhật ký hệ thống (người thực hiện, nội dung, thời điểm).
- Mỗi dự án tối đa một lượt cảnh báo mỗi ngày cho mỗi người nhận.
- Ngưỡng là tỷ lệ phân số trong `[-1.0, 1.0]`; thiếu hoặc ngoài khoảng: `400 VALIDATION_ERROR`.
- Nội dung thông báo hiển thị tỷ lệ 2 chữ số thập phân (ví dụ `-5.00%`, `15.00%`).

### `NCL-09-CN-005` — Báo cáo biên lợi nhuận theo khách hàng và theo nhân sự

- **TC-01** `GET /reports/margin/by-customer`: gộp theo khách hàng (qua dự án) trong kỳ `from`..`to`.
- **TC-02** `GET /reports/margin/by-employee`: gộp theo nhân sự thực hiện.
- **TC-03** Chỉ `VT-01`; vai trò khác `403` và được ghi nhật ký. Mỗi lần xem thành công ghi log truy cập `MARGIN`.
- Giá vốn tính cho mọi dòng đã duyệt (kể cả không tính phí); doanh thu chỉ dòng `billable=true`.
- Thiếu `from`/`to`, hoặc `from` sau `to`: `400 VALIDATION_ERROR`. Kỳ không có giờ công đã duyệt: `lines: []`, các tổng bằng 0.
- `marginPercent` là `null` khi doanh thu bằng 0.

### `NCL-09-CN-006` — So sánh biên lợi nhuận dự kiến với thực tế

- So sánh biên dự kiến (từ báo giá mới nhất gắn với hợp đồng) với biên thực tế (từ giờ công đã duyệt); trả `marginGapPercentPoints` và `gapReasons`.
- **TC-02** Dự án chưa có báo giá nào gắn kèm: `404 RESOURCE_NOT_FOUND`.
- **TC-03** Chỉ `VT-02`; vai trò khác `403` và được ghi nhật ký.
- Số liệu tổng hợp cấp dự án nên không áp dụng che dữ liệu `QTN-02`; mỗi lần xem ghi log truy cập `MARGIN`.

### `NCL-09-CN-007` — Dự báo lợi nhuận tới khi kết thúc dự án

- **TC-01** Chưa vượt ngân sách giờ công: giờ còn lại = ngân sách − giờ đã dùng.
- **TC-02** Đã vượt ngân sách: giờ còn lại ngoại suy theo tốc độ tiêu hao thực tế (`actualHours / taskCompletionRate`); kèm cảnh báo trong `warnings`.
- `forecastCost = actualCost + remainingHours × giá vốn bình quân thực tế`; hợp đồng `FIXED_PRICE` lấy trọn giá trị hợp đồng làm `forecastRevenue`.
- `riskOfLoss = true` khi `forecastMargin` âm.
- Chỉ `VT-02`; vai trò khác `403` và được ghi nhật ký; mỗi lần xem ghi log truy cập `MARGIN`.

### Bằng chứng kiểm thử hiện có

| Phạm vi | Vị trí |
|---|---|
| Backend Epic 9 (14 lớp test) | `backend/src/test/java/com/serviceops/modules/profitability/` |
| Rủi ro giao dịch khi thiếu đơn giá (proxy giao dịch thật) | `RevenueRecognitionTransactionTest` |
| Frontend 8 màn hình Epic 9 | `frontend/src/modules/profitability/__tests__/` |
