# API Contract — Service Operations

Tài liệu này là hợp đồng API dùng chung giữa Backend và Frontend. Mỗi khi có API mới, người làm `BE-API`
bổ sung thêm 1 mục theo đúng Epic/Story tương ứng bên dưới — Frontend chỉ cần đọc file này, không cần đọc code backend.

## Quy ước chung

- **Base URL (local dev):** `http://localhost:8080/api/v1`
- **Định dạng dữ liệu:** JSON, `Content-Type: application/json`, charset UTF-8.
- **Xác thực:** sau khi đăng nhập, đính kèm token vào mọi request cần bảo vệ:
  ```
  Authorization: Bearer <accessToken>
  ```
- **Khuôn dạng response thành công:**
  ```json
  {
    "success": true,
    "message": null,
    "data": { }
  }
  ```
- **Khuôn dạng response lỗi:**
  ```json
  {
    "success": false,
    "errorCode": "INVALID_CREDENTIALS",
    "message": "Ten tai khoan hoac mat khau khong dung",
    "timestamp": "2026-08-20T16:44:42.4065497",
    "fieldErrors": null
  }
  ```
  `fieldErrors` chỉ xuất hiện khi lỗi validate dữ liệu đầu vào (mã lỗi `VALIDATION_ERROR`), dạng
  `[{ "field": "username", "message": "Ten tai khoan khong duoc de trong" }]`.
- **Danh sách mã lỗi:** xem [error-codes.md](error-codes.md).
- **Swagger UI (tra cứu trực tiếp khi backend đang chạy):** `http://localhost:8080/api/v1/swagger-ui/index.html`
- **OpenAPI JSON (import vào Postman/Insomnia):** `http://localhost:8080/api/v1/v3/api-docs`

## Epic `NCL-09` — Biên lợi nhuận thực theo thời gian thực

### `NCL-09-CN-001` — Tính giá vốn giờ công của dự án

#### GET `/projects/{projectId}/profitability/labor-cost`

Tính động giá vốn nhân sự từ các dòng giờ công `APPROVED` của dự án. Mỗi dòng được nhân với chi phí giờ công của nhân sự có `effectiveFrom` gần nhất nhưng không sau `workDate`; dòng chưa có chi phí hiệu lực vẫn được trả về với `missingCostData=true` và không cộng vào `totalLaborCost`.

**Quyền**: `VT-01`, `VT-02`, `VT-05`.

**Response `200 OK`**

```json
{
  "success": true,
  "message": null,
  "data": {
    "projectId": 42,
    "totalApprovedHours": 12.00,
    "totalLaborCost": 3000000.00,
    "missingCostEntryCount": 0,
    "lines": [
      {
        "timeEntryId": 901,
        "employeeId": 17,
        "workDate": "2026-01-15",
        "hours": 8.00,
        "hourlyRate": 250000.00,
        "laborCost": 2000000.00,
        "missingCostData": false
      }
    ]
  }
}
```

`hourlyRate` và `laborCost` ở từng dòng là dữ liệu nhạy cảm và được che tự động theo `QTN-02`; mỗi lần đọc endpoint ghi một log truy cập dữ liệu `COST`. Dòng đảo/correction đã duyệt được tính theo đúng số giờ mang dấu của bản ghi.

### `NCL-09-CN-002` — Tính doanh thu ghi nhận của dự án

#### GET `/projects/{projectId}/profitability/revenue`

Tính động doanh thu ghi nhận của dự án theo đúng loại hợp đồng (`Contract.contractType`) — khác với tiền
đã thu/đã xuất hoá đơn (QTN-15: đơn giá áp theo thời điểm phát sinh).

- **`TIME_AND_MATERIAL`** (hợp đồng theo giờ) — phương thức `HOURLY`: với mỗi dòng giờ công `APPROVED`
  của dự án, nếu `billable=true` thì tra đơn giá áp dụng tại đúng `workDate` của dòng đó (kế thừa
  `NCL-07-CN-005`/QTN-16, đã nhân hệ số `workType` theo `NCL-07-CN-006`), quy đổi đơn giá/ngày sang
  đơn giá/giờ (giả định **1 ngày công = 8 giờ**) rồi nhân với số giờ để ra doanh thu của dòng; cộng dồn
  thành `totalRecognizedRevenue`. Dòng `billable=false` bị loại khỏi doanh thu (vẫn tính vào giá vốn ở
  `NCL-09-CN-001`) — trả về với `billable=false`. Dòng chưa tra được đơn giá (chưa khai báo cấp bậc,
  chưa có đơn giá hiệu lực...) trả về với `missingRateData=true`, không cộng vào tổng.
- **`FIXED_PRICE`** (hợp đồng trọn gói) — phương thức `PERCENTAGE_OF_COMPLETION`: `totalRecognizedRevenue`
  = `Contract.totalValue` nhân `completionRate` (= số `Task.status = DONE` / tổng số công việc của dự án,
  làm tròn 4 chữ số thập phân).
- **`MAINTENANCE`, `MILESTONE`**: chưa được hỗ trợ — trả lỗi `400 INVALID_STATE`.

**Quyền**: `VT-01` (Ban giám đốc), `VT-05` (Kế toán) — vai trò khác nhận `403 FORBIDDEN`.

**Response `200 OK` (hợp đồng theo giờ):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "projectId": 42,
    "contractId": 5,
    "contractType": "TIME_AND_MATERIAL",
    "recognitionMethod": "HOURLY",
    "totalRecognizedRevenue": 2400000.00,
    "totalBillableHours": 8.00,
    "excludedLineCount": 0,
    "missingRateEntryCount": 0,
    "completionRate": null,
    "totalTaskCount": null,
    "doneTaskCount": null,
    "lines": [
      {
        "timeEntryId": 901,
        "employeeId": 17,
        "workDate": "2026-06-30",
        "hours": 8.00,
        "appliedRate": 300000.0000,
        "lineRevenue": 2400000.00,
        "billable": true,
        "missingRateData": false
      }
    ]
  }
}
```

**Response `200 OK` (hợp đồng trọn gói):** `totalBillableHours`/`excludedLineCount`/`missingRateEntryCount`/
`lines` rỗng hoặc `0`; `completionRate`, `totalTaskCount`, `doneTaskCount` có giá trị, ví dụ
`{ "recognitionMethod": "PERCENTAGE_OF_COMPLETION", "totalRecognizedRevenue": 60000000.00, "completionRate": 0.6000, "totalTaskCount": 5, "doneTaskCount": 3 }`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Không phải `VT-01`/`VT-05` — ghi nhật ký lần từ chối (TC-04) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy dự án hoặc hợp đồng |
| 400 | `INVALID_STATE` | Loại hợp đồng `MAINTENANCE`/`MILESTONE`, chưa được hỗ trợ |

**Lưu ý:**
- Mỗi lần đọc endpoint ghi một log truy cập dữ liệu `REVENUE` (TC-05).
- Để tự động tra đơn giá cho từng dòng giờ công (thay vì bắt Frontend nhập tay `level` như
  `NCL-07-CN-005`), hồ sơ nhân sự (`GET/POST/PUT /employees`) nay có thêm trường `level` (cấp bậc,
  tùy chọn) — nhân sự chưa khai báo cấp bậc sẽ khiến các dòng giờ công của người đó bị đánh dấu
  `missingRateData=true` thay vì chặn cả lượt tính doanh thu.

### `NCL-09-CN-003` — Hiển thị biên lợi nhuận thời gian thực

#### GET `/projects/{projectId}/profitability/margin`

Tính động biên lợi nhuận gộp của dự án từ doanh thu ghi nhận và toàn bộ chi phí đã duyệt tại thời
điểm đọc. Công thức: `totalCost = laborCost + projectExpenseCost + subcontractorCost`,
`grossProfit = recognizedRevenue - totalCost`, `marginRate = grossProfit / recognizedRevenue`. Khi
doanh thu bằng `0`, `marginRate` là `null` để tránh chia cho `0`. Hai danh sách
`laborCostLines` và `revenueLines` cho phép truy ngược về các dòng cấu thành biên; dữ liệu giá vốn trong
`laborCostLines` tiếp tục được che theo `QTN-02`.

**Quyền**: `VT-01` (Ban giám đốc), `VT-02` (Quản lý dự án), `VT-05` (Kế toán).

**Response `200 OK`**

```json
{
  "success": true,
  "message": null,
  "data": {
    "projectId": 42,
    "recognizedRevenue": 5000000.00,
    "laborCost": 3000000.00,
    "projectExpenseCost": 0.00,
    "subcontractorCost": 0.00,
    "totalCost": 3000000.00,
    "grossProfit": 2000000.00,
    "marginRate": 0.4000,
    "missingCostEntryCount": 0,
    "missingRateEntryCount": 0,
    "laborCostLines": [],
    "revenueLines": []
  }
}
```

`recognizedRevenue` dùng đúng quy tắc của `NCL-09-CN-002`; `laborCost` dùng đúng quy tắc của
`NCL-09-CN-001`. Nếu thiếu đơn giá hoặc giá vốn, tổng chỉ cộng các dòng đủ dữ liệu và hai bộ đếm
`missing*EntryCount` cho biết phần còn thiếu.

**Response lỗi:** `403 FORBIDDEN` nếu không thuộc ba vai trò trên; `404 RESOURCE_NOT_FOUND` hoặc
`400 INVALID_STATE` được truyền theo quy tắc của các phép tính doanh thu và giá vốn thành phần.

### `NCL-09-CN-004` — Cảnh báo dự án âm biên

Ngưỡng biên lợi nhuận tối thiểu là cấu hình **toàn công ty** (không theo từng dự án) do Ban giám đốc
đặt. Mỗi lần `GET /projects/{projectId}/profitability/margin` được gọi (tức mỗi lần "tính lại" biên
lợi nhuận, QTN-21), hệ thống tự động so `marginRate` với ngưỡng hiện hành và gửi thông báo trong ứng
dụng cho **quản lý dự án** (`Project.projectManagerId`) và **toàn bộ Ban giám đốc** (`VT-01`) nếu thấp
hơn. Dự án chưa phát sinh doanh thu (`marginRate = null`, xem `NCL-09-CN-003`) được bỏ qua thay vì báo
âm biên. Mỗi dự án chỉ nhận tối đa một lượt cảnh báo mỗi ngày (chống spam khi được xem lại nhiều lần).

#### `GET /profitability/margin-alert-threshold`

Xem ngưỡng hiện hành. **Quyền**: `VT-01`, `VT-02`, `VT-05`.

**Response `200 OK`:**
```json
{ "success": true, "data": { "minMarginRate": 0.1500, "updatedBy": "giamdoc", "updatedAt": "2026-09-18T17:03:56" } }
```
Các trường đều `null` nếu Ban giám đốc chưa từng đặt ngưỡng — khi đó hệ thống không cảnh báo cho bất kỳ
dự án nào.

#### `PUT /profitability/margin-alert-threshold`

Đặt/đổi ngưỡng. **Quyền**: chỉ `VT-01` (TC-03) — vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký
lần từ chối tự động.

**Request:**
```json
{ "minMarginRate": 0.15 }
```
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `minMarginRate` | number | có | Tỷ lệ dạng phân số (0.15 = 15%), cùng đơn vị với `marginRate` của `NCL-09-CN-003`. |

**Response thành công:** cùng cấu trúc `GET` ở trên. Mỗi lần đặt/đổi ngưỡng thành công ghi một dòng vào
Nhật ký hệ thống — người thực hiện, nội dung, thời điểm (TC-04).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Không phải Ban giám đốc (`VT-01`) — ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `minMarginRate` hoặc ngoài khoảng `[-1.0, 1.0]` |

**Lưu ý cho Frontend:** thông báo cảnh báo (`type = NEGATIVE_MARGIN_ALERT`) đọc qua API có sẵn của
Epic thông báo (`GET /notifications`) — không có API riêng để "xem lịch sử cảnh báo".

### `NCL-09-CN-005` — Báo cáo biên lợi nhuận theo khách hàng và theo nhân sự

Gộp doanh thu ghi nhận và giá vốn giờ công của mọi dòng giờ công **đã duyệt** (`APPROVED`) có `workDate`
nằm trong kỳ `from`..`to`, theo hai chiều: khách hàng (qua dự án) và nhân sự thực hiện.

- **Giá vốn** (mọi dòng, kể cả không tính phí — `QTN-17`): `hours × chi phí giờ công của nhân sự hiệu lực tại workDate`.
- **Doanh thu** (chỉ dòng `billable=true` — theo đúng quy tắc của `NCL-09-CN-002-TC-03`): `hours × (đơn giá ngày hiệu lực tại workDate × hệ số loại hình công việc ÷ 8)`, đơn giá ưu tiên đơn giá riêng hợp đồng rồi mới đến bảng giá chung (`QTN-15`/`QTN-16`).
- Dòng thiếu chi phí giờ công hiệu lực bị loại khỏi giá vốn (đếm vào `missingCostEntryCount`); dòng có tính phí nhưng nhân sự chưa khai báo cấp bậc (`Employee.level`) hoặc thiếu đơn giá bán hiệu lực ở đúng cặp (vai trò, cấp bậc) đó bị loại khỏi doanh thu (đếm vào `missingRevenueEntryCount`). Hai trường hợp này **không** làm lỗi cả báo cáo.
- `marginPercent` là `null` khi doanh thu bằng 0 (không chia được).

**Quyền**: chỉ `VT-01` (Ban giám đốc) — vai trò khác bị từ chối `403 FORBIDDEN` và được ghi vào Nhật ký hệ thống (`QTN-01`/`QTN-03`). Mỗi lần xem thành công ghi một log truy cập dữ liệu `MARGIN`.

#### GET `/reports/margin/by-customer?from={yyyy-MM-dd}&to={yyyy-MM-dd}`

**Response `200 OK`**

```json
{
  "success": true,
  "message": null,
  "data": {
    "periodFrom": "2026-01-01",
    "periodTo": "2026-01-31",
    "totalRevenue": 6000000.00,
    "totalCost": 2400000.00,
    "totalMargin": 3600000.00,
    "totalMarginPercent": 60.00,
    "missingCostEntryCount": 0,
    "missingRevenueEntryCount": 0,
    "lines": [
      {
        "customerId": 1000,
        "customerCode": "KH001",
        "customerName": "Công ty A",
        "approvedHours": 8.00,
        "revenue": 4000000.00,
        "cost": 1600000.00,
        "margin": 2400000.00,
        "marginPercent": 60.00
      }
    ]
  }
}
```

#### GET `/reports/margin/by-employee?from={yyyy-MM-dd}&to={yyyy-MM-dd}`

Cùng khuôn dạng, `lines[]` gồm `employeeId`, `employeeName`, `professionalRole`, `approvedHours`, `revenue`,
`cost`, `margin`, `marginPercent` thay cho các trường theo khách hàng.

`from`/`to` là tham số bắt buộc (`GET` query) — thiếu tham số trả `400 VALIDATION_ERROR`; `from` sau `to` cũng trả `400 VALIDATION_ERROR`. Kỳ không phát sinh giờ công đã duyệt nào trả `lines: []` và các tổng bằng `0` (không phải lỗi). `totalCost`, `totalMargin`, `totalMarginPercent` và các trường `cost`/`margin`/`marginPercent` của từng dòng là dữ liệu nhạy cảm, được che tự động theo `QTN-02` với vai trò không đủ quyền (tuy endpoint đã giới hạn `VT-01` nên trong thực tế không phát sinh).

### `NCL-09-CN-006` — So sánh biên lợi nhuận dự kiến với thực tế

#### GET `/projects/{projectId}/profitability/planned-vs-actual-margin`

So sánh biên lợi nhuận **dự kiến** (từ báo giá mới nhất đã dùng sẵn cho hợp đồng của dự án —
`NCL-04-CN-001`) với biên lợi nhuận **thực tế** (từ mọi dòng giờ công **đã duyệt** của dự án tính đến
hiện tại, cùng công thức QTN-15/16/17 với `NCL-09-CN-005`).

- **Doanh thu dự kiến** = `totalAmount` của báo giá. **Chi phí dự kiến** ước tính theo từng dòng báo giá:
  `số ngày công × 8 × chi phí giờ công bình quân của các nhân sự đang giữ cùng vai trò chuyên môn` (báo
  giá lập trước khi giao việc cho người cụ thể nên chưa biết chính xác ai sẽ làm). Dòng báo giá có vai
  trò chưa có nhân sự nào đảm nhiệm bị loại khỏi chi phí dự kiến, đếm vào `missingPlannedCostItemCount`.
- **Doanh thu/chi phí thực tế**: tính như `NCL-09-CN-005` nhưng gộp toàn bộ dự án (không giới hạn kỳ).
- `marginGapPercentPoints` = `actualMarginPercent - plannedMarginPercent` (điểm phần trăm; `null` nếu
  thiếu dữ liệu để tính 1 trong 2 vế). `gapReasons` là danh sách diễn giải ngắn theo hai nguyên nhân:
  giờ công thực tế vượt kế hoạch, và/hoặc chi phí giờ công bình quân thực tế cao hơn dự kiến.

**Quyền**: chỉ `VT-02` (Quản lý dự án) — vai trò khác bị từ chối `403 FORBIDDEN` và được ghi vào Nhật ký
hệ thống (`QTN-01`/`QTN-03`). Mỗi lần xem thành công ghi một log truy cập dữ liệu `MARGIN`. Khác với
`labor-cost` (che chi phí/giờ công theo TỪNG nhân sự), endpoint này chỉ trả số liệu tổng hợp cấp dự án
nên **không** áp dụng che dữ liệu `QTN-02` (PM là người dùng chính của báo cáo).

**Response `200 OK`**

```json
{
  "success": true,
  "message": null,
  "data": {
    "projectId": 42,
    "quoteId": 7,
    "quoteVersion": 2,
    "plannedWorkDays": 20.00,
    "plannedRevenue": 100000000.00,
    "plannedCost": 70000000.00,
    "plannedMargin": 30000000.00,
    "plannedMarginPercent": 30.00,
    "actualHours": 178.00,
    "actualRevenue": 100000000.00,
    "actualCost": 82000000.00,
    "actualMargin": 18000000.00,
    "actualMarginPercent": 18.00,
    "marginGapPercentPoints": -12.00,
    "hoursVarianceVsPlanned": 18.00,
    "gapReasons": [
      "Gio cong thuc te vuot ke hoach 18.00 gio (tuong duong 2.25 ngay cong).",
      "Chi phi gio cong thuc te binh quan (460674.16/gio) cao hon du kien (437500.00/gio)."
    ],
    "missingPlannedCostItemCount": 0,
    "missingActualCostEntryCount": 0,
    "missingActualRevenueEntryCount": 0
  }
}
```

**Response lỗi — dự án chưa có báo giá nào gắn kèm (`404 RESOURCE_NOT_FOUND`, TC-02):**
```json
{
  "success": false,
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "Du an chua co bao gia nao gan kem de so sanh bien du kien voi thuc te",
  "timestamp": "2026-09-18T10:00:00",
  "fieldErrors": null
}
```

### `NCL-09-CN-007` — Dự báo lợi nhuận tới khi kết thúc dự án

#### GET `/projects/{projectId}/profitability/profit-forecast`

Ngoại suy lợi nhuận của dự án **tới khi hoàn thành**, từ dữ liệu giờ công/chi phí/doanh thu thực tế
hiện hành (tái dùng `NCL-09-CN-001`/`NCL-09-CN-002`) và ngân sách giờ công của các công việc
(`Task.budgetHours`, `NCL-05-CN-005`) — không lưu snapshot, cùng mô hình "tính động" với các báo cáo
khác của Epic 9.

- **`remainingHours`** (giờ còn lại): khi dự án **chưa** vượt ngân sách (`overBudget=false`, TC-01) =
  `budgetHours - actualHours` (đúng phần ngân sách chưa dùng). Khi **đã** vượt ngân sách (TC-02), ngân
  sách không còn là mốc tin cậy nên ngoại suy theo tốc độ tiêu hao thực tế:
  `estimatedTotalHoursAtCompletion = actualHours / taskCompletionRate` (tỷ lệ hoàn thành = số công việc
  `DONE` / tổng số công việc), rồi `remainingHours` là phần còn thiếu tới mốc đó. Dự án chưa khai báo
  ngân sách giờ công cho công việc nào thì `remainingHours = 0` kèm cảnh báo trong `warnings`.
- **`forecastCost`** = chi phí thực tế + `remainingHours × đơn giá vốn bình quân thực tế` (=
  `actualCost / actualHours`).
- **`forecastRevenue`**: hợp đồng trọn gói (`FIXED_PRICE`) là trọn giá trị hợp đồng (doanh thu ghi nhận
  theo tỷ lệ hoàn thành công việc, không phụ thuộc số giờ); hợp đồng theo giờ
  (`TIME_AND_MATERIAL`) = doanh thu thực tế + `remainingHours × đơn giá bán bình quân thực tế`.
- `marginVariancePercentPoints` = `forecastMarginPercent - actualMarginPercent` (điểm phần trăm; `null`
  nếu thiếu dữ liệu để tính 1 trong 2 vế). `riskOfLoss=true` khi `forecastMargin` âm — kèm cảnh báo
  tương ứng trong `warnings` (cùng danh sách với cảnh báo vượt ngân sách/thiếu ngân sách giờ công).

**Quyền**: chỉ `VT-02` (Quản lý dự án) — vai trò khác bị từ chối `403 FORBIDDEN` và được ghi vào Nhật ký
hệ thống (`QTN-01`/`QTN-03`). Mỗi lần xem thành công ghi một log truy cập dữ liệu `MARGIN`. Cùng lý do
với `planned-vs-actual-margin` (chỉ trả số liệu tổng hợp cấp dự án, PM là người dùng chính), endpoint
này **không** áp dụng che dữ liệu `QTN-02`.

**Response `200 OK` (TC-02, dự án đã vượt ngân sách giờ công):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "projectId": 42,
    "budgetHours": 160.00,
    "actualHours": 200.00,
    "remainingHours": 40.00,
    "overBudget": true,
    "taskCompletionRate": 0.8000,
    "estimatedTotalHoursAtCompletion": 240.00,
    "actualRevenue": 80000000.00,
    "actualCost": 60000000.00,
    "actualMargin": 20000000.00,
    "actualMarginPercent": 25.00,
    "forecastRevenue": 96000000.00,
    "forecastCost": 72000000.00,
    "forecastMargin": 24000000.00,
    "forecastMarginPercent": 25.00,
    "marginVariancePercentPoints": 0.00,
    "riskOfLoss": false,
    "warnings": [
      "Du an da vuot ngan sach gio cong (200.00/160.00 gio) - phan con lai duoc uoc tinh theo toc do tieu hao thuc te."
    ]
  }
}
```

## Epic `NCL-08` — Chi phí dự án

### `NCL-08-CN-001` — Ghi nhận chi phí phát sinh của dự án

#### `POST /projects/{projectId}/expenses`

Yêu cầu token của nhân viên chuyên môn (`VT-03`). Chỉ dự án đang chạy mới nhận chi phí.

**Request:**
```json
{
  "type": "TRAVEL",
  "amount": 2000000,
  "expenseDate": "2026-09-10",
  "description": "Chi phi di lai gap khach hang",
  "receiptUrl": "https://files.example/receipt-1.pdf",
  "billable": false
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `projectId` | number | có | Lấy từ URL. Phải trỏ tới dự án đang chạy. |
| `type` | string | có | `TRAVEL`, `TOOLS` hoặc `OTHER`. |
| `amount` | number | có | Lớn hơn `0`, đơn vị tiền tệ của công ty. |
| `expenseDate` | date | có | Định dạng `YYYY-MM-DD`, không được ở tương lai. |
| `description` | string | có | Không rỗng, tối đa 1000 ký tự. |
| `receiptUrl` | string | không | Đường dẫn chứng từ mô phỏng, tối đa 500 ký tự. |
| `billable` | boolean | không | Có tính lại cho khách hàng hay không; mặc định `false`. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Ghi nhan chi phi thanh cong",
  "data": {
    "id": 30,
    "projectId": 1,
    "userId": 7,
    "type": "TRAVEL",
    "amount": 2000000.00,
    "expenseDate": "2026-09-10",
    "description": "Chi phi di lai gap khach hang",
    "receiptUrl": "https://files.example/receipt-1.pdf",
    "billable": false,
    "status": "SUBMITTED",
    "createdAt": "2026-09-10T08:00:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu/sai loại chi phí, số tiền không dương, mô tả rỗng hoặc ngày ở tương lai. |
| 400 | `INVALID_STATE` | Dự án đã đóng hoặc không còn ở trạng thái `RUNNING`. |
| 403 | `FORBIDDEN` | Token không có vai trò `VT-03`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy dự án. |

Sau khi tạo, phiếu ở trạng thái `SUBMITTED`; hệ thống ghi audit gồm người tạo, thời điểm và nội dung thao tác.

### `NCL-08-CN-002` — Duyệt chi phí dự án

Kế toán (`VT-05`) xem hàng chờ duyệt, duyệt hoặc từ chối phiếu chi phí. Phiếu được duyệt là dữ liệu
được phép đưa vào giá vốn dự án; phiếu từ chối giữ nguyên dữ liệu gốc và lưu lý do để người tạo xử lý lại.

#### `GET /expenses/pending`

Trả về các phiếu đang ở trạng thái `SUBMITTED`, sắp xếp theo ngày phát sinh tăng dần rồi tới mã phiếu.
Yêu cầu token của kế toán (`VT-05`).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 30,
      "projectId": 1,
      "userId": 7,
      "type": "TRAVEL",
      "amount": 2000000.00,
      "expenseDate": "2026-09-10",
      "description": "Chi phi di lai gap khach hang",
      "receiptUrl": "https://files.example/receipt-1.pdf",
      "billable": false,
      "status": "SUBMITTED",
      "createdAt": "2026-09-10T08:00:00",
      "approvedBy": null,
      "approvedAt": null,
      "rejectedBy": null,
      "rejectedAt": null,
      "rejectReason": null
    }
  ]
}
```

#### `POST /expenses/{expenseId}/approve`

Duyệt một phiếu đang `SUBMITTED`. Không cần request body. Khi thành công, phiếu chuyển sang `APPROVED`,
lưu người duyệt và thời điểm duyệt, đồng thời ghi audit. Chỉ phiếu `APPROVED` được tính vào giá vốn dự án.

**Response thành công — `200 OK`:** trả về cùng cấu trúc `ExpenseRes` như hàng chờ, với `status` là
`APPROVED`, `approvedBy` và `approvedAt` có giá trị.

#### `POST /expenses/{expenseId}/reject`

Từ chối một phiếu đang `SUBMITTED`. Yêu cầu token của kế toán (`VT-05`) và lý do là bắt buộc.

**Request:**
```json
{
  "reason": "Thieu chung tu goc"
}
```

**Response thành công — `200 OK`:** trả về cùng cấu trúc `ExpenseRes`, với `status` là `REJECTED`,
`rejectedBy`, `rejectedAt` và `rejectReason` có giá trị.

**Response lỗi cho cả ba endpoint:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request từ chối thiếu lý do hoặc lý do dài hơn 1000 ký tự. |
| 400 | `INVALID_STATE` | Phiếu không còn ở trạng thái `SUBMITTED` (đã duyệt hoặc đã từ chối). |
| 403 | `FORBIDDEN` | Token không có vai trò `VT-05`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy phiếu chi phí. |

Mọi thao tác duyệt/từ chối đều ghi audit gồm người thực hiện, thời điểm, phiếu và lý do từ chối nếu có.

#### `PUT /expenses/{expenseId}`

Người tạo phiếu (`VT-03`) dùng lại request tạo chi phí để sửa và nộp lại phiếu đang `REJECTED`.
Hệ thống kiểm tra người gọi đúng là `userId` của phiếu, dự án còn `RUNNING`, sau đó xóa thông tin từ chối,
chuyển trạng thái về `SUBMITTED` và đưa phiếu trở lại hàng chờ duyệt. Phiếu `SUBMITTED` hoặc `APPROVED`
không được sửa.

### `NCL-08-CN-003` — Đánh dấu chi phí tính lại cho khách hàng

#### `PUT /expenses/{expenseId}/billable`

Yêu cầu token của quản lý dự án (`VT-02`). Chỉ phiếu chi phí đã được kế toán duyệt (`APPROVED`) mới được
đánh dấu hoặc bỏ đánh dấu tính lại cho khách hàng. Endpoint là idempotent: gửi lại cùng giá trị không tạo thêm
thay đổi dữ liệu ngoài bản ghi audit.

**Request:**
```json
{
  "billable": true
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `expenseId` | number | có | Lấy từ URL; phải trỏ tới phiếu chi phí đã duyệt. |
| `billable` | boolean | có | `true` để tính lại cho khách hàng, `false` để bỏ đánh dấu. |

**Response thành công — `200 OK`:** trả về cùng cấu trúc `ExpenseRes`, với `billable` bằng giá trị vừa cập nhật
và `status` là `APPROVED`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu trường `billable` hoặc giá trị không phải boolean. |
| 400 | `INVALID_STATE` | Phiếu chưa được duyệt, đã ở trạng thái khác `APPROVED`, hoặc đã nằm trong hóa đơn khi yêu cầu bỏ đánh dấu. |
| 403 | `FORBIDDEN` | Token không có vai trò `VT-02`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy phiếu chi phí. |

Mỗi lần cập nhật ghi audit gồm người thực hiện, thời điểm, phiếu và giá trị `billable` mới.

---

## Epic `NCL-01` — Đăng nhập và phân quyền theo cây tổ chức

### `NCL-01-CN-001` — Đăng nhập hệ thống

#### `POST /auth/login`

Không cần token (endpoint công khai).

**Request:**
```json
{
  "username": "admin",
  "password": "Password@123"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `username` | string | có | |
| `password` | string | có | |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "userId": 1,
    "username": "admin",
    "fullName": "Quan tri vien demo",
    "roles": ["VT-07"]
  }
}
```

`roles` là danh sách mã vai trò (`VT-01`..`VT-09` theo Mục 2 backlog) — Frontend dùng trường này để điều hướng
đúng trang chính / hiển thị đúng menu theo vai trò (đáp ứng AC-01 của story).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Sai tài khoản hoặc mật khẩu |
| 401 | `ACCOUNT_LOCKED` | Tài khoản đang tạm khóa do nhập sai mật khẩu 5 lần liên tiếp — `message` kèm theo số phút còn lại, ví dụ `"...Vui long thu lai sau 12 phut."` |
| 401 | `ACCOUNT_INACTIVE` | Tài khoản bị quản trị viên khóa (không phải khóa tạm tự động) |
| 400 | `VALIDATION_ERROR` | Thiếu `username`/`password` |

**Lưu ý cho Frontend:**
- Sau khi có `accessToken`, lưu tạm ở bộ nhớ ứng dụng (Redux store), không cần tự parse JWT — mọi thông tin cần
  hiển thị (`userId`, `username`, `fullName`, `roles`) backend đã trả sẵn trong `data`.
- Khi bất kỳ API nào trả về `401` với `errorCode` khác `INVALID_CREDENTIALS`/`ACCOUNT_LOCKED` (ví dụ token hết hạn),
  điều hướng người dùng quay lại màn hình đăng nhập (đáp ứng AC-03 của story).
- **Tài khoản mẫu (data seed) — mật khẩu tất cả là `Password@123`.** Nguồn: `backend/src/main/resources/db/seed/`.
  Cây tổ chức: Trung Tâm Vận Hành [10] › Ban Giám Đốc [1] › {PMO [2], Kinh Doanh [3], Kế Toán [4], Nhân Sự [5], Phòng Công Nghệ & Giải Pháp [6]};
  Phòng Công Nghệ & Giải Pháp [6] › {Nhóm Phát Triển [7], Nhóm Tư Vấn [8], Nhóm Kiểm Thử [9]}.

  | username | Vai trò | Phòng | Phạm vi dữ liệu | Ghi chú |
  |---|---|---|---|---|
  | `admin` | `VT-07` Quản trị viên | Phòng Công Nghệ & Giải Pháp | COMPANY | Tài khoản hệ thống, không có hồ sơ nhân sự |
  | `giamdoc` | `VT-01` Ban giám đốc | Ban Giám Đốc | COMPANY | |
  | `pm.lead` | `VT-02` Quản lý dự án | PMO | COMPANY | Trưởng phòng (giám sát dự án/HĐ toàn công ty) |
  | `pm01` | `VT-02` Quản lý dự án | PMO | SELF | |
  | `sale.lead` | `VT-04` Kinh doanh | Kinh Doanh | DEPARTMENT → Kinh Doanh | Trưởng phòng |
  | `sale01` | `VT-04` Kinh doanh | Kinh Doanh | SELF | |
  | `ketoan.lead` / `ketoan01` | `VT-05` Kế toán | Kế Toán | COMPANY | |
  | `nhansu` / `hr01` | `VT-06` Nhân sự | Nhân Sự | COMPANY | |
  | `tcn.director` | `VT-02` Quản lý dự án | Phòng Công Nghệ & Giải Pháp | DEPARTMENT → Phòng Công Nghệ & Giải Pháp (gồm cả 3 nhóm con) | |
  | `dev.lead` / `dev01` | `VT-03` Chuyên môn | Nhóm Phát Triển Phần Mềm | SELF | |
  | `dev02` | `VT-03` Chuyên môn | Nhóm Phát Triển Phần Mềm | SELF | **Bán thời gian — 20h/tuần** |
  | `consult.lead` | `VT-03` Chuyên môn | Nhóm Tư Vấn Giải Pháp | SELF | |
  | `qa.lead` | `VT-03` Chuyên môn | Nhóm Kiểm Thử & QA | SELF | |
  | `khachhang01` | `VT-09` Khách hàng | *(ngoài cây tổ chức)* | SELF | Tài khoản cổng khách hàng |

  Ví dụ dùng: kiểm thử màn hình chỉ Nhân sự/Kế toán/Ban giám đốc được xem (`GET /masking-rules`, `NCL-01-CN-005`)
  bằng `nhansu` hoặc `ketoan01`; kiểm thử phạm vi "một nhánh + con cháu" bằng `tcn.director`.

---

### `NCL-01-CN-002` — Quản lý tài khoản người dùng

Các endpoint dưới đây yêu cầu token của quản trị viên (`VT-07`).

#### `GET /users?keyword={keyword}`

Trả về danh sách tài khoản; `keyword` tùy chọn và tìm theo tên tài khoản hoặc họ tên.

#### `POST /users`

```json
{
  "username": "nguyenan",
  "password": "Password@123",
  "fullName": "Nguyen Van An",
  "email": "an@example.com",
  "departmentId": 2,
  "roleCodes": ["VT-08"],
  "scopeType": "COMPANY"
}
```

Tên tài khoản là duy nhất. Mật khẩu được băm trước khi lưu; `passwordHash` không bao giờ xuất hiện trong response.

#### `PUT /users/{id}`

Cập nhật `fullName`, `email`, `departmentId`, `roleCodes` và tùy chọn `password`. `username` không đổi.

#### `PATCH /users/{id}/status`

```json
{ "status": "LOCKED" }
```

`status` nhận `ACTIVE`, `LOCKED` hoặc `INACTIVE`. Khi mở lại bằng `ACTIVE`, hệ thống xóa bộ đếm đăng nhập sai và thời gian khóa tạm.

Các lỗi riêng của story: `DUPLICATE_DATA` (409), `RESOURCE_NOT_FOUND` (404), `INVALID_STATE` (400), `FORBIDDEN` (403).

---

### `NCL-01-CN-005` — Che dữ liệu lương và giá vốn theo cấp quản lý

Đây là một **cơ chế dùng chung**, không phải một màn hình riêng: bất kỳ trường JSON nào ở bất kỳ API nào
(hiện tại và sau này — báo giá, chấm công, chi phí, báo cáo hiệu quả dự án...) nếu backend đánh dấu là dữ liệu
lương/giá vốn thì sẽ tự động được che, không cần Frontend làm gì thêm ở tầng gọi API.

**Quy tắc áp dụng (cố định, không cấu hình theo từng người dùng):**

| Vai trò được xem dữ liệu thật | Mã |
|---|---|
| Nhân sự | `VT-06` |
| Kế toán | `VT-05` |
| Ban giám đốc | `VT-01` |

Mọi vai trò khác (quản lý dự án, nhân viên chuyên môn, nhân viên kinh doanh...) sẽ nhận giá trị bị che.

**Cách nhận biết một trường bị che ở phía Frontend:**

Trường bị che luôn trả về đúng chuỗi ký tự `"***"` thay cho giá trị thật (số, chuỗi...), ví dụ:

```json
{ "success": true, "data": { "revenue": 500000000, "laborCost": "***" } }
```

so với cùng API đó khi gọi bằng tài khoản Kế toán:

```json
{ "success": true, "data": { "revenue": 500000000, "laborCost": 320000000 } }
```

Frontend nên viết một hàm dùng chung: nếu giá trị của một ô tiền tệ đúng bằng chuỗi `"***"` thì hiển thị icon khóa
kèm tooltip "Không có quyền xem", thay vì cố gắng format nó như một con số.

#### `GET /masking-rules`

Trả về danh sách quy tắc che dữ liệu đang hiệu lực — dùng cho màn hình "Cấu hình quy tắc che dữ liệu" (TC-04).
Yêu cầu token của Nhân sự / Kế toán / Ban giám đốc (`VT-06`, `VT-05`, `VT-01`); vai trò khác nhận `403 FORBIDDEN`.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    { "level": "SALARY", "levelLabel": "Lương / chi phí giờ công nội bộ", "allowedRoles": ["VT-01", "VT-05", "VT-06"] },
    { "level": "COST", "levelLabel": "Giá vốn", "allowedRoles": ["VT-01", "VT-05", "VT-06"] }
  ]
}
```

**Lưu ý cho Frontend:**
- Mọi lần một trường bị che được đọc (qua JSON) hoặc một tài khoản không đủ quyền cố mở `GET /masking-rules`,
  backend đều ghi log hệ thống (đáp ứng TC-05 và TC-04 của story) — Frontend không cần gọi thêm API nào để việc
  ghi log này xảy ra, chỉ cần gọi API bình thường.
- TC-01 (báo cáo hiệu quả dự án hiện doanh thu nhưng che giá vốn) và TC-02 (tệp xuất không có cột bị che) sẽ được
  thể hiện đầy đủ khi các API báo cáo/dự án thật (`NCL-09`, `NCL-11`) được triển khai; cơ chế `"***"` ở trên áp
  dụng y hệt cho các API đó khi có.

---

### `NCL-01-CN-006` — Nhật ký truy cập dữ liệu nhạy cảm

Chỉ **Quản trị viên** (`VT-07`) được truy cập (TC-03). Yêu cầu token `Authorization: Bearer <accessToken>`.

#### `GET /sensitive-access-logs`

Tra cứu nhật ký truy cập dữ liệu nhạy cảm (lương, chi phí, giá vốn, biên lợi nhuận) theo bộ lọc và phân trang.

**Query params:**

| Tham số | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `userId` | number | không | Lọc theo mã người dùng thực hiện truy cập |
| `username` | string | không | Lọc theo tên tài khoản (tìm chứa, không phân biệt hoa thường) |
| `dataType` | string | không | `SALARY`, `COST`, `COST_OF_GOODS` hoặc `MARGIN` |
| `from` | datetime | không | Ngày giờ bắt đầu (ISO-8601), bao gồm |
| `to` | datetime | không | Ngày giờ kết thúc (ISO-8601), bao gồm |
| `page` | number | không | Số trang, bắt đầu từ 0 (mặc định `0`) |
| `size` | number | không | Số bản ghi mỗi trang, từ 1–200 (mặc định `20`) |

**Ví dụ:**
```
GET /api/v1/sensitive-access-logs?userId=1&from=2026-08-01T00:00:00&to=2026-08-31T23:59:59&page=0&size=20
```

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "content": [
      {
        "id": 12,
        "userId": 1,
        "username": "admin",
        "action": "EXPORT",
        "dataType": "MARGIN",
        "targetId": 5,
        "targetRef": "DuAn/5",
        "ipAddress": "203.0.113.25",
        "detail": "Xuat bao cao bien loi nhuan",
        "accessedAt": "2026-08-20T16:44:42"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

- `action` nhận `VIEW` (xem), `EXPORT` (xuất), hoặc `DENIED` (bị từ chối).
- `dataType` nhận `SALARY`, `COST`, `COST_OF_GOODS`, `MARGIN`.
- Khi không có bản ghi thỏa bộ lọc, `content` rỗng và `totalElements = 0` (TC-02).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải quản trị viên (`VT-07`) — hệ thống cũng ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Tham số `page`/`size` không hợp lệ |

---

### `NCL-01-CN-007` — Quản lý hồ sơ nhân sự và giờ làm việc chuẩn

Yêu cầu token của **Nhân sự** (`VT-06`) hoặc **Quản trị viên** (`VT-07`); vai trò khác nhận `403 FORBIDDEN` (TC-04).

`standardHoursPerWeek` là **mẫu số của tỷ lệ giờ tính phí** (dùng ở báo cáo `NCL-11-CN-002` sau này) — nếu
không truyền khi tạo hồ sơ, hệ thống mặc định `40.00`; nếu truyền giá trị khác (ví dụ `20.00` cho nhân sự bán
thời gian) thì hệ thống lưu đúng giá trị đó, **không tự làm tròn về 40** (TC-01, TC-02).

#### `GET /employees?keyword={keyword}&departmentId={departmentId}`

Danh sách hồ sơ nhân sự, cả hai tham số đều tùy chọn. `keyword` tìm theo tên tài khoản hoặc họ tên.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 5,
      "username": "nhanvien01",
      "fullName": "Nguyen Van A",
      "departmentId": 2,
      "departmentName": "Phong ky thuat",
      "professionalRole": "Ky su phan mem",
      "standardHoursPerWeek": 40.00,
      "hireDate": "2026-01-01",
      "endDate": null
    }
  ]
}
```

#### `GET /employees/{id}`

Chi tiết một hồ sơ, kèm danh sách hợp đồng lao động (`contracts`) — xem cấu trúc `EmploymentContractRes` ở mục
`POST /employees/{id}/contracts` bên dưới.

#### `POST /employees`

```json
{
  "userId": 5,
  "departmentId": 2,
  "professionalRole": "Ky su phan mem",
  "hireDate": "2026-01-01",
  "endDate": null,
  "standardHoursPerWeek": 40.00
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `userId` | number | có | Tài khoản phải tồn tại và **chưa có hồ sơ nhân sự nào khác** gắn với nó |
| `departmentId` | number | không | |
| `professionalRole` | string | không | Tối đa 255 ký tự |
| `hireDate` | date (`yyyy-MM-dd`) | có | Ngày vào làm |
| `endDate` | date | không | Phải **không sớm hơn** `hireDate`, nếu không hệ thống trả lỗi và không lưu (TC-03) |
| `standardHoursPerWeek` | number | không | Bỏ trống → mặc định `40.00`; nếu truyền phải > 0 |

#### `PUT /employees/{id}`

Cùng cấu trúc `POST /employees` nhưng bỏ `userId` (không đổi được tài khoản gắn với hồ sơ).

#### `POST /employees/{id}/contracts`

Ghi nhận một hợp đồng lao động cho hồ sơ.

```json
{ "contractType": "PART_TIME", "startDate": "2026-01-01", "endDate": "2026-12-31" }
```

`contractType` nhận `FULL_TIME` hoặc `PART_TIME`. `endDate` (nếu có) không được sớm hơn `startDate`.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": { "id": 10, "employeeId": 1, "contractType": "PART_TIME", "startDate": "2026-01-01", "endDate": "2026-12-31", "createdAt": "2026-08-24T10:00:00" }
}
```

#### `GET /employees/{id}/contracts`

Danh sách hợp đồng lao động của một hồ sơ, mới nhất trước.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Không phải Nhân sự/Quản trị viên — hệ thống ghi nhật ký lần từ chối (TC-04) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy tài khoản, bộ phận hoặc hồ sơ nhân sự |
| 409 | `DUPLICATE_DATA` | Tài khoản đã có hồ sơ nhân sự |
| 400 | `INVALID_STATE` | `endDate` sớm hơn ngày bắt đầu (TC-03) |

#### Lịch ngày nghỉ lễ (`/holidays`) — bổ sung cho QTN-23

Ngày lễ **không tính vào giờ làm việc chuẩn** của báo cáo tỷ lệ giờ tính phí (`NCL-11-CN-002`) và KPI
`billableHoursRatio` của bảng điều khiển (`NCL-11-CN-001`). Cùng phân quyền với hồ sơ nhân sự: chỉ Nhân sự
(`VT-06`) và Quản trị viên (`VT-07`); vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối. Bảng
chưa có dữ liệu mẫu — đến khi được khai báo, mọi ngày thứ Hai đến thứ Sáu đều tính là ngày làm việc. Mỗi lần thêm,
sửa, xóa đều ghi Nhật ký hệ thống (người thực hiện, nội dung, thời điểm).

**Body** của `POST /holidays` và `PUT /holidays/{id}`:
```json
{ "name": "Quoc khanh", "holidayDate": "2026-09-02", "recurringYearly": true }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tối đa 255 ký tự |
| `holidayDate` | date (`yyyy-MM-dd`) | có | Mỗi ngày chỉ khai báo được một lần |
| `recurringYearly` | boolean | không | `true` cho ngày lễ cố định theo dương lịch (1/1, 30/4, 1/5, 2/9): áp dụng cùng ngày/tháng của mọi năm từ năm của `holidayDate` (29/2 chỉ ở năm nhuận). Mặc định `false` cho ngày lễ một lần (Tết Nguyên đán, Giỗ Tổ, ngày nghỉ bù) |

- `GET /holidays` — danh sách ngày lễ theo `holidayDate` tăng dần, mỗi phần tử `{ id, name, holidayDate, recurringYearly }`.
- `POST /holidays` — thêm một ngày lễ, trả ngày lễ vừa tạo.
- `PUT /holidays/{id}` — sửa ngày lễ, trả bản sau khi sửa.
- `DELETE /holidays/{id}` — xóa ngày lễ.

Quy tắc tính giờ chuẩn: chỉ ngày lễ rơi vào thứ Hai đến thứ Sáu mới bị trừ (cuối tuần vốn không có giờ chuẩn), và chỉ
ngày lễ nằm trong thời gian làm việc của nhân sự. Nhân sự bán thời gian mất đúng số giờ/ngày của mình (`standardHoursPerWeek` ÷ 5).
**Giờ công làm vào ngày lễ vẫn được cộng vào giờ tính phí** nhưng không cộng thêm giờ chuẩn, nên tỷ lệ của người làm ngày
lễ có thể vượt 100%. Chưa hỗ trợ "làm bù" vào ngày cuối tuần: chỉ khai báo được ngày nghỉ, không khai báo được ngày làm thêm.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Không phải Nhân sự/Quản trị viên |
| 400 | `VALIDATION_ERROR` | Thiếu `name` hoặc `holidayDate`, `name` quá 255 ký tự, hoặc ngày sai định dạng |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy ngày lễ `{id}` khi sửa/xóa |
| 409 | `DUPLICATE_DATA` | Ngày này đã được khai báo là ngày lễ |

---

### `NCL-01-CN-008` — Đổi mật khẩu và khôi phục mật khẩu

Bốn endpoint: đổi mật khẩu (cần đăng nhập), quên/khôi phục mật khẩu (công khai — chưa đăng nhập được vẫn cần dùng).

**Lưu ý quan trọng cho Frontend:** sau khi đổi mật khẩu (TC-01) hoặc khôi phục mật khẩu thành công, **`accessToken`
hiện tại (kể cả token vừa dùng để gọi API đổi mật khẩu) cũng bị vô hiệu hóa ngay lập tức** — không chỉ "các phiên
khác". Mọi request tiếp theo dùng token cũ sẽ nhận `401`. Vì vậy sau khi nhận response thành công từ
`/auth/change-password` hoặc `/auth/reset-password`, Frontend phải chủ động xóa token đang lưu và điều hướng người
dùng về màn hình đăng nhập, không chờ đến khi request kế tiếp trả về `401`.

#### `POST /auth/change-password`

Yêu cầu header `Authorization: Bearer <token>`.

```json
{ "currentPassword": "Password@123", "newPassword": "MatKhauMoi456" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `currentPassword` | string | có | |
| `newPassword` | string | có | Tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số; phải khác mật khẩu hiện tại |

**Response thành công — `200 OK`:** `{ "success": true, "data": null }`

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập (thiếu/sai token) |
| 401 | `INVALID_CREDENTIALS` | `currentPassword` không đúng |
| 400 | `VALIDATION_ERROR` | `newPassword` không đạt chính sách mật khẩu, hoặc trùng mật khẩu hiện tại |

#### `POST /auth/forgot-password`

Không cần token. Luôn trả `200 OK` bất kể email có tồn tại trong hệ thống hay không (tránh lộ danh sách tài khoản
hợp lệ) — Frontend chỉ nên hiển thị một thông báo chung dạng "Nếu email tồn tại, liên kết khôi phục đã được gửi".

```json
{ "email": "nhanvien01@service-operations.local" }
```

**Response thành công — `200 OK`:** `{ "success": true, "data": null }`

Liên kết khôi phục có hạn dùng mặc định 30 phút và **chỉ dùng được một lần**.

**`SMTP_HOST` cấu hình MỘT LẦN duy nhất** (thường trỏ vào một dịch vụ gửi thư thật như Gmail/SES).
Từ đó, mỗi lần gửi mã, hệ thống **tự động quyết định theo TỪNG địa chỉ email** — không còn phải đổi
cấu hình bằng tay tùy theo định gửi cho ai:

| | Cách quyết định | Kết quả |
|---|---|---|
| Tên miền **không có bản ghi MX** (ví dụ `service-operations.local` của dữ liệu mẫu) | `DomainReachabilityChecker` tra DNS trước khi gửi | Ghi ra logger `AUDIT_MOCK_EMAIL`, **không** gọi SMTP |
| Tên miền **có bản ghi MX** (ví dụ `gmail.com`) | | Gửi thật qua SMTP. **Không bao giờ** ghi token ra log, kể cả khi gửi thất bại |
| `SMTP_HOST` rỗng, profile `prod` | | Ứng dụng **dừng khởi động** kèm thông báo nói rõ thiếu biến nào |

**Vì sao tra MX trước thay vì cứ gọi SMTP rồi bắt lỗi:** một số máy chủ SMTP (kể cả dùng Gmail làm
relay) chấp nhận thư ngay ở bước giao dịch (trả `250 OK`) rồi mới bounce lại **không đồng bộ** sau đó,
khi đã thử phân giải địa chỉ đích và phát hiện không tồn tại. Nếu chỉ dựa vào `mailSender.send()`
không ném lỗi để kết luận "gửi thành công" thì kết luận đó có thể sai. Tra MX là bước kiểm tra đồng bộ
và đáng tin cậy hơn.

Trước đây hệ thống dùng `SMTP_HOST` như một công tắc toàn cục (có cấu hình = luôn gửi thật, không có
= luôn ghi log) — nghĩa là người vận hành phải tự đổi biến môi trường qua lại giữa hai lần chạy tùy
theo định gửi cho tài khoản mẫu hay tài khoản thật. Đó là một lỗ hổng thiết kế: quên đổi lại khiến mã
gửi cho tài khoản thật rơi vào log giả lập thay vì hộp thư thật. Mô hình theo domain đã thay thế hoàn
toàn cách làm đó.

Ở `prod`, thiếu `SMTP_HOST` thì dừng khởi động là **chủ đích**: nếu để lên bình thường, ứng dụng sẽ im
lặng không gửi được thư trong khi giao diện vẫn báo "đã gửi" — người dùng bị khoá ngoài mà không ai biết.
Cần đủ: `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `FRONTEND_BASE_URL`.

**Mã 6 chữ số**, không phải liên kết. Mã lưu trong CSDL dưới dạng SHA-256 của chuỗi `"<userId>:<mã>"`
(cột `password_reset_tokens.token_hash`) — đọc được bảng này cũng không đặt lại được mật khẩu của ai.

Vì không gian chỉ có 1.000.000 khả năng, mã **bắt buộc** đi kèm ba rào chắn, thiếu một cái là yếu hơn hẳn
token dài trước đây:

1. **Đếm số lần nhập sai** — quá 5 lần thì mã chết, phải xin mã mới. Việc đếm chạy trong một **giao dịch
   riêng** (`PasswordResetAttemptRecorder`): nếu đếm chung giao dịch với phần ném lỗi thì Spring cuộn ngược
   và xoá luôn con số vừa đếm, tức rào chắn không tồn tại.
2. **Tra cứu theo người dùng**, không theo mã trần — nên `POST /auth/reset-password` bắt buộc có `email`.
3. **Hạn dùng 10 phút** thay vì 30.

**Giới hạn tần suất:** mặc định 5 lần / 15 phút, chặn theo **cả** địa chỉ IP lẫn địa chỉ email
(`PASSWORD_RESET_RATE_LIMIT_*`). Vượt hạn mức trả `TOO_MANY_REQUESTS`.

Phản hồi **không phân biệt** "email không tồn tại" với "đã gửi liên kết", để tránh dò danh sách tài khoản hợp lệ.

#### `GET /auth/reset-password/validate?token={token}`

Không cần token đăng nhập. Dùng để kiểm tra liên kết khôi phục còn hiệu lực **trước khi** hiển thị form đặt mật khẩu
mới (TC-02) — tránh để người dùng nhập mật khẩu mới rồi mới báo lỗi liên kết hết hạn.

**Response thành công — `200 OK`:** `{ "success": true, "data": true }` hoặc `{ "success": true, "data": false }`
(`false` khi token không tồn tại, đã hết hạn, hoặc đã được dùng).

#### `POST /auth/reset-password`

Không cần token đăng nhập.

```json
{ "token": "5xx3fqt1fdJkjjA7a9iRjkl8YPyUmtfFiooskWpQOzA", "newPassword": "MatKhauMoi456" }
```

**Response thành công — `200 OK`:** `{ "success": true, "data": null }`

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `RESET_TOKEN_INVALID` | Token không tồn tại, đã hết hạn, hoặc đã được dùng trước đó (TC-02) |
| 400 | `VALIDATION_ERROR` | `newPassword` không đạt chính sách mật khẩu |
| 400 | `VALIDATION_ERROR` | Thiếu `userId`/`hireDate` hoặc `standardHoursPerWeek` ≤ 0 |

---

## Epic `NCL-02` — Quản lý khách hàng

### `NCL-02-CN-001` — Tạo hồ sơ khách hàng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án** (`VT-02`); vai trò khác nhận
`403 FORBIDDEN` (TC-03).

#### `POST /customers`

```json
{
  "name": "Cong ty TNHH ABC",
  "taxCode": "0101234567",
  "phone": "0987654321",
  "industry": "Cong nghe thong tin",
  "address": "Ha Noi"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tên khách hàng, tối đa 255 ký tự — bỏ trống thì bị từ chối (TC-02) |
| `taxCode` | string | không | Mã số thuế, tối đa 50 ký tự |
| `phone` | string | không | Số điện thoại, tối đa 30 ký tự — dùng thêm để đối chiếu chống trùng ở `NCL-02-CN-002` |
| `industry` | string | không | Lĩnh vực/ngành nghề, tối đa 255 ký tự |
| `address` | string | không | Địa chỉ, tối đa 500 ký tự |

Hệ thống **tự sinh** `code` (mã khách hàng) duy nhất dạng `KH-xxxxxx`, không truyền lên và không tự đặt được (QTN-05).

**Trước khi gọi `POST /customers`, Frontend nên gọi `POST /customers/check-duplicate` trước** (xem mục
`NCL-02-CN-002` bên dưới) để hiển thị cảnh báo hồ sơ nghi trùng cho người dùng xác nhận — vì bản thân
`POST /customers` cũng tự kiểm tra và **chặn lưu ngay** (`409 DUPLICATE_DATA`) nếu phát hiện hồ sơ giống cao,
không đợi Frontend gọi trước.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Tao ho so khach hang thanh cong",
  "data": {
    "id": 1,
    "code": "KH-227265",
    "name": "Cong ty TNHH ABC",
    "taxCode": "0101234567",
    "phone": "0987654321",
    "industry": "Cong nghe thong tin",
    "address": "Ha Noi",
    "createdAt": "2026-08-26T10:00:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh/Quản lý dự án — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu hoặc để trống `name` (TC-02) |
| 409 | `DUPLICATE_DATA` | Phát hiện hồ sơ đã có mức độ giống cao (`NCL-02-CN-002`, TC-01) — xem cách xử lý ở mục dưới |

**Lưu ý cho Frontend:**
- `code` chỉ có sau khi tạo thành công — không hiển thị ô nhập mã khách hàng trên form tạo, chỉ hiển thị `code`
  trả về sau khi lưu (ví dụ ở toast thông báo hoặc bảng danh sách).
- Quản lý người liên hệ (`NCL-02-CN-003`) xem mục riêng bên dưới.

#### `GET /customers`

Bước D/P của wireframe `NCL-02-CN-001` (“Hiển thị / Cập nhật bảng danh sách khách hàng”). Cùng phân quyền với
`POST /customers`: token của **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án** (`VT-02`); vai trò khác
nhận `403 FORBIDDEN` và bị ghi nhật ký (QTN-01).

**Query params (không bắt buộc, kết hợp với nhau theo AND):**

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `keyword` | string | Lọc theo `name` / `code` (KH-xxxxxx) / `taxCode` / `phone` — **khớp chứa**, không phân biệt hoa thường. |
| `industry` | string | Lọc theo nhãn ngành nghề (`NCL-02-CN-005`) — **khớp chính xác** (đã cắt khoảng trắng), không phân biệt hoa thường. |
| `companySize` | string | Lọc theo nhãn quy mô (`NCL-02-CN-005`) — khớp chính xác, không phân biệt hoa thường. |
| `priority` | string | Lọc theo nhãn mức độ ưu tiên (`NCL-02-CN-005`) — khớp chính xác, không phân biệt hoa thường. |

Bỏ trống hết → trả toàn bộ. Không có hồ sơ nào khớp → `data: []` (không phải lỗi — dùng cho `NCL-02-CN-005` TC-02).

**Response thành công — `200 OK`** (danh sách sắp theo `createdAt` giảm dần, hồ sơ mới nhất lên đầu):
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 2,
      "code": "KH-000002",
      "name": "Cong ty CP XYZ",
      "taxCode": null,
      "phone": null,
      "industry": null,
      "address": null,
      "createdAt": "2026-08-27T09:00:00",
      "companySize": null,
      "priority": null,
      "status": "ACTIVE",
      "mergedIntoId": null
    },
    {
      "id": 1,
      "code": "KH-227265",
      "name": "Cong ty TNHH ABC",
      "taxCode": "0101234567",
      "phone": "0987654321",
      "industry": "Cong nghe thong tin",
      "address": "Ha Noi",
      "createdAt": "2026-08-26T10:00:00",
      "companySize": "Vua",
      "priority": "Cao",
      "status": "ACTIVE",
      "mergedIntoId": null
    }
  ]
}
```

> Mọi response `CustomerRes` (ở tất cả endpoint khách hàng) từ nay có thêm bốn trường `companySize`, `priority`
> (có thể `null` khi hồ sơ chưa được phân nhóm — xem `NCL-02-CN-005`), cùng `status`
> (`ACTIVE` · `INACTIVE` · `MERGED`) và `mergedIntoId` (id hồ sơ đã nhận dữ liệu khi hồ sơ này đã bị gộp — xem
> `NCL-02-CN-006`). Frontend nên ẩn hoặc gắn nhãn "Đã gộp" và khoá thao tác với hồ sơ có `status = MERGED`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh/Quản lý dự án |

**Lưu ý cho Frontend:**
- `data` là mảng thuần, **không phân trang** — Frontend tự lọc/sắp trên máy khách nếu cần.
- Khi `data` rỗng → hiển thị trạng thái rỗng (“Chưa có hồ sơ khách hàng nào”), không phải lỗi.
- Đây là nguồn dữ liệu để mở màn hình Xem hồ sơ tổng hợp (`GET /customers/{customerId}/overview`, `NCL-02-CN-004`).

---

### `NCL-02-CN-002` — Chống trùng hồ sơ khách hàng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án** (`VT-02`), giống hệt `NCL-02-CN-001`;
vai trò khác nhận `403 FORBIDDEN` (TC-04).

**Luồng khuyến nghị cho Frontend (form tạo khách hàng):**
1. Người dùng điền form → gọi `POST /customers/check-duplicate` trước khi submit thật.
2. Nếu `data` rỗng → gọi luôn `POST /customers` như bình thường (TC-03).
3. Nếu `data` có phần tử với `similarity` cao → hiển thị danh sách hồ sơ nghi trùng cho người dùng xem, kèm nút
   "Vẫn tạo mới" yêu cầu nhập **lý do bắt buộc** → gọi `POST /customers/create-with-override` (TC-01, TC-02).
4. Kể cả khi Frontend bỏ qua bước 1 và gọi thẳng `POST /customers`, backend vẫn tự chặn (`409 DUPLICATE_DATA`)
   nếu phát hiện trùng cao — bước check-duplicate chỉ để hiển thị cảnh báo *trước* cho người dùng, không phải
   điều kiện bắt buộc để backend chặn.

#### `POST /customers/check-duplicate`

Kiểm tra hồ sơ dự định tạo có nghi trùng với hồ sơ đã có không — **không tạo hồ sơ**, chỉ trả về danh sách gợi ý.
Body giống hệt `POST /customers` (dùng lại `CustomerCreateReq`).

```json
{ "name": "Cong Ty TNHH ABC", "taxCode": "0101234567", "phone": "0987654321", "industry": null, "address": null }
```

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 9,
      "code": "KH-000009",
      "name": "Cong ty TNHH ABC",
      "taxCode": "0101234567",
      "phone": "0987654321",
      "similarity": 0.95,
      "matchedFields": ["maSoThue"]
    }
  ]
}
```

- `data` là mảng **rỗng** khi không có hồ sơ nào nghi trùng (TC-03) — Frontend cho tạo luôn, không hiện cảnh báo.
- `similarity` từ `0.0` đến `1.0` (`1.0` là trùng tuyệt đối); ngưỡng **`>= 0.9`** là mức mà `POST /customers` sẽ
  tự chặn lưu (TC-01) — Frontend nên tô đỏ/nhấn mạnh các hồ sơ có `similarity >= 0.9` vì chắc chắn sẽ bị chặn
  nếu người dùng bấm lưu bình thường, phải đi qua `create-with-override`.
- `matchedFields` cho biết trường nào khớp: `"ten"`, `"maSoThue"`, `"soDienThoai"` — dùng để giải thích lý do
  nghi trùng cho người dùng (ví dụ tô đậm ô mã số thuế nếu `matchedFields` chứa `"maSoThue"`).
- Danh sách sắp xếp giảm dần theo `similarity`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh/Quản lý dự án — hệ thống ghi nhật ký lần từ chối (TC-04) |
| 400 | `VALIDATION_ERROR` | Thiếu hoặc để trống `name` |

#### `POST /customers/create-with-override`

Xác nhận tạo hồ sơ mới **bất chấp cảnh báo trùng**, bắt buộc kèm lý do (TC-02).

```json
{
  "customer": {
    "name": "Cong ty TNHH ABC",
    "taxCode": "0101234567",
    "phone": null,
    "industry": null,
    "address": null
  },
  "override": {
    "reason": "Hai phap nhan khac nhau, chi trung ten viet tat"
  }
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `customer` | object | có | Giống hệt body của `POST /customers` |
| `override.reason` | string | có | Lý do xác nhận đây không phải trùng lặp thật, tối đa 1000 ký tự — để trống bị từ chối |

Endpoint này **không tự kiểm tra lại** xem có thực sự tồn tại hồ sơ nghi trùng hay không — nó luôn tạo hồ sơ mới
kèm ghi lại lý do, dùng đúng lúc người dùng đã thấy cảnh báo từ `check-duplicate` (hoặc từ lỗi `409` của
`POST /customers`) và chủ động xác nhận đây là hai khách hàng khác nhau.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Tao ho so khach hang thanh cong (bo qua canh bao trung)",
  "data": {
    "id": 2,
    "code": "KH-000002",
    "name": "Cong ty TNHH ABC",
    "taxCode": "0101234567",
    "phone": null,
    "industry": null,
    "address": null,
    "createdAt": "2026-08-26T10:05:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh/Quản lý dự án — hệ thống ghi nhật ký lần từ chối (TC-04) |
| 400 | `VALIDATION_ERROR` | Thiếu `customer.name` hoặc để trống `override.reason` (TC-02) |

**Lưu ý cho Frontend:**
- Sau khi override thành công, hồ sơ được tạo bình thường như `POST /customers` — không có gì khác biệt ở phía
  hiển thị, chỉ khác ở chỗ lý do bỏ qua cảnh báo đã được lưu lại phía backend để tra soát sau này (TC-05), không
  cần Frontend hiển thị hay xử lý gì thêm với lý do đó sau khi gửi.
- Mọi lần tạo (kể cả bình thường lẫn override) và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký —
  Frontend không cần gọi thêm API nào để việc ghi log này xảy ra.

#### `PUT /customers/{customerId}`

Chỉnh sửa thông tin hồ sơ khách hàng đã tạo: `name`, `taxCode`, `phone`, `industry`, `address`. Ngành nghề /
quy mô / mức độ ưu tiên **phân nhóm** vẫn dùng `PATCH /customers/{customerId}/segment`.

**Xác thực:** token của **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án** (`VT-02`).

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | string | có | ≤ 255 ký tự, không để trống |
| `taxCode` | string | không | rỗng, hoặc 10 chữ số (`0101234567`), hoặc `10 số-3 số` (`0101234567-001`) |
| `phone` | string | không | rỗng, hoặc số di động/cố định VN hợp lệ |
| `industry` | string | không | ≤ 255 ký tự |
| `address` | string | không | ≤ 500 ký tự |

**Response thành công:** `200` với `data` là `CustomerRes` sau khi sửa (giống `GET /customers`).

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải `VT-04` / `VT-02` |
| 404 | `RESOURCE_NOT_FOUND` | Không có hồ sơ khách hàng với `customerId` |
| 400 | `VALIDATION_ERROR` | Dữ liệu sai ràng buộc, **hoặc hồ sơ đã bị gộp (`MERGED`) — không cho sửa** |
| 409 | `DUPLICATE_DATA` | Sau khi sửa, `name`/`taxCode`/`phone` trùng cao với **hồ sơ khác** (bản thân hồ sơ đang sửa được tự loại khỏi so khớp) |

Backend ghi Audit Log hành động `UPDATE`.

#### `POST /customers/{customerId}/update-with-override`

Xác nhận lưu chỉnh sửa dù có cảnh báo trùng — dùng khi `PUT /customers/{customerId}` trả `409 DUPLICATE_DATA`.

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `customer` | object | có | Giống hệt body của `PUT /customers/{customerId}` |
| `override.reason` | string | có | Lý do bắt buộc, ≤ 1000 ký tự |

Lỗi giống `POST /customers/create-with-override`. Backend lưu lý do vào log tra soát và ghi Audit Log
`UPDATE_WITH_OVERRIDE`.

**Luồng khuyến nghị (Frontend):** người dùng sửa hồ sơ → gọi lại `POST /customers/check-duplicate` với dữ liệu
mới, **tự lọc bỏ ứng viên có `id` trùng hồ sơ đang sửa** → nếu vẫn còn ứng viên nghi trùng thì hiện cảnh báo,
người dùng nhập lý do → gọi `POST /customers/{customerId}/update-with-override`; nếu không còn thì gọi thẳng
`PUT /customers/{customerId}`.

---

### `NCL-02-CN-003` — Quản lý người liên hệ của khách hàng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) — khác với `NCL-02-CN-001`/`002`, vai trò **Quản lý dự án
không được truy cập** nhóm API này; vai trò khác (kể cả `VT-02`) nhận `403 FORBIDDEN` (TC-03).

Mỗi khách hàng có thể có nhiều người liên hệ nhưng **chỉ duy nhất một người là đầu mối chính** tại một thời điểm
(`isPrimary = true`). Có hai cách để một người liên hệ trở thành đầu mối chính, cả hai đều tự động chuyển đầu
mối chính hiện tại (nếu có) thành đầu mối phụ (TC-02):
1. Đánh dấu `isPrimary: true` ngay khi thêm mới (`POST .../contacts`).
2. Đặt lại đầu mối chính cho một người liên hệ đã tồn tại (`PATCH .../contacts/{contactId}/primary`).

#### `GET /customers/{customerId}/contacts`

Danh sách người liên hệ của một khách hàng — **đầu mối chính luôn hiện ở đầu danh sách** (TC-01), phần còn lại
sắp theo thời điểm thêm vào (`createdAt` tăng dần).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "customerId": 10,
      "fullName": "Nguyen Van A",
      "title": "Giam doc mua hang",
      "email": "a@congty.vn",
      "phone": "0901234567",
      "isPrimary": true,
      "createdAt": "2026-08-27T09:00:00"
    },
    {
      "id": 1,
      "customerId": 10,
      "fullName": "Nguyen Van B",
      "title": "Ke toan",
      "email": null,
      "phone": null,
      "isPrimary": false,
      "createdAt": "2026-08-26T14:00:00"
    }
  ]
}
```

#### `POST /customers/{customerId}/contacts`

```json
{
  "fullName": "Nguyen Van A",
  "title": "Giam doc mua hang",
  "email": "a@congty.vn",
  "phone": "0901234567",
  "isPrimary": true
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `fullName` | string | có | Họ tên người liên hệ, tối đa 255 ký tự — bỏ trống thì bị từ chối |
| `title` | string | không | Chức danh, tối đa 255 ký tự |
| `email` | string | không | Thư điện tử hợp lệ, tối đa 255 ký tự |
| `phone` | string | không | Số điện thoại, tối đa 30 ký tự |
| `isPrimary` | boolean | không (mặc định `false`) | Đánh dấu là đầu mối chính — nếu khách hàng đã có đầu mối chính khác, người cũ tự chuyển thành đầu mối phụ (TC-02) |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Them nguoi lien he thanh cong",
  "data": {
    "id": 2,
    "customerId": 10,
    "fullName": "Nguyen Van A",
    "title": "Giam doc mua hang",
    "email": "a@congty.vn",
    "phone": "0901234567",
    "isPrimary": true,
    "createdAt": "2026-08-27T09:00:00"
  }
}
```

#### `PATCH /customers/{customerId}/contacts/{contactId}/primary`

Đặt một người liên hệ **đã tồn tại** làm đầu mối chính — không cần body. Đầu mối chính hiện tại của khách hàng
(nếu có và khác người này) tự động chuyển thành đầu mối phụ (TC-02).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Cap nhat dau moi chinh thanh cong",
  "data": {
    "id": 1,
    "customerId": 10,
    "fullName": "Nguyen Van B",
    "title": "Ke toan",
    "email": null,
    "phone": null,
    "isPrimary": true,
    "createdAt": "2026-08-26T14:00:00"
  }
}
```

**Response lỗi (áp dụng cho cả ba endpoint trên):**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh (`VT-04`) — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu hoặc để trống `fullName`, hoặc `email` sai định dạng |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy `customerId`, hoặc `contactId` không thuộc về khách hàng này |

**Lưu ý cho Frontend:**
- Khác với `NCL-02-CN-001`/`002`, nhóm API này **chỉ** cho phép vai trò Nhân viên kinh doanh (`VT-04`) — Quản lý
  dự án (`VT-02`) sẽ nhận `403 FORBIDDEN` dù được phép tạo khách hàng.
- Trên bảng danh sách người liên hệ, Frontend nên gắn nhãn "Đầu mối chính" cho phần tử đầu tiên (`isPrimary`
  luôn `true` duy nhất ở một phần tử) và cho phép bấm nút "Đặt làm đầu mối chính" trên các dòng còn lại, gọi
  `PATCH .../contacts/{contactId}/primary`.
- Mọi lần thêm mới và mọi lần đổi đầu mối chính đều được backend tự ghi nhật ký vào cùng bảng nhật ký khách
  hàng dùng chung với `NCL-02-CN-002` (TC-04) — Frontend không cần gọi thêm API nào để việc ghi log này xảy ra.

---

### `NCL-02-CN-005` — Phân nhóm khách hàng theo ngành và quy mô

Gắn nhãn **ngành nghề**, **quy mô** và **mức độ ưu tiên** cho một hồ sơ khách hàng đã tồn tại, để lọc và phân
tích theo nhóm. Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án** (`VT-02`) — giống
`NCL-02-CN-001`/`004`; vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03).

#### `PATCH /customers/{customerId}/segment`

```json
{
  "industry": "Cong nghe thong tin",
  "companySize": "Vua",
  "priority": "Cao"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `industry` | string | có | Nhãn ngành nghề, tối đa 255 ký tự — không được để trống (TC-01). Ghi đè giá trị `industry` hiện có của hồ sơ. |
| `companySize` | string | có | Nhãn quy mô, tối đa 50 ký tự — không được để trống. |
| `priority` | string | có | Nhãn mức độ ưu tiên, tối đa 50 ký tự — không được để trống. |

Đây là thao tác **thay cả ba nhãn cùng lúc** (không phải patch từng phần): mỗi lần gọi phải gửi đủ ba trường.

Ba nhãn hiện là **văn bản tự do** (chưa gắn danh mục cứng ở backend). Frontend nên dựng dropdown với bộ giá trị
thống nhất, gợi ý:
- `companySize`: `Nhỏ` · `Vừa` · `Lớn`
- `priority`: `Cao` · `Trung bình` · `Thấp`
- `industry`: dùng lại danh sách ngành đã hiển thị ở form tạo hồ sơ (`NCL-02-CN-001`).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Cap nhat phan nhom khach hang thanh cong",
  "data": {
    "id": 1,
    "code": "KH-227265",
    "name": "Cong ty TNHH ABC",
    "taxCode": "0101234567",
    "phone": "0987654321",
    "industry": "Cong nghe thong tin",
    "address": "Ha Noi",
    "createdAt": "2026-08-26T10:00:00",
    "companySize": "Vua",
    "priority": "Cao"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải `VT-04`/`VT-02` — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu / để trống một trong ba nhãn, hoặc vượt quá độ dài cho phép |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy `customerId` |

**Lưu ý cho Frontend:**
- Sau khi gán nhãn, lọc danh sách bằng `GET /customers?industry=...&companySize=...&priority=...` (khớp **chính
  xác**, không phân biệt hoa thường; kết hợp AND với nhau và với `keyword`). Xem mục `GET /customers` ở trên.
- Nhóm lọc không có khách hàng nào → `data: []`; Frontend hiển thị trạng thái "không có kết quả phù hợp" (TC-02).
- Mỗi lần cập nhật phân nhóm được backend tự ghi nhật ký (`SEGMENT_UPDATE`: người thực hiện · nội dung · thời
  điểm) vào bảng nhật ký khách hàng dùng chung với `NCL-02-CN-002` (TC-04) — Frontend không cần gọi thêm API.

---

### `NCL-02-CN-006` — Gộp hai hồ sơ khách hàng trùng

Yêu cầu token của **Quản trị viên** (`VT-07`) — khác với `NCL-02-CN-001`/`002` (Sales/PM), vì thao tác này ảnh
hưởng toàn bộ dữ liệu liên quan của khách hàng. Vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối
(TC-03), dùng chung cơ chế với `NCL-02-CN-001`/`002`.

#### `POST /customers/merge/preview`

Xem trước ảnh hưởng trước khi gộp thật — **không làm thay đổi dữ liệu**, chỉ đọc.

```json
{ "targetCustomerId": 1, "sourceCustomerId": 2 }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `targetCustomerId` | number | có | Hồ sơ **giữ lại** (hồ sơ chính) — sẽ nhận toàn bộ dữ liệu liên quan |
| `sourceCustomerId` | number | có | Hồ sơ **bị gộp** (hồ sơ phụ) — sẽ chuyển sang trạng thái đã gộp sau khi gộp thật |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "targetCustomer": { "id": 1, "code": "KH-000001", "name": "Cong ty TNHH ABC", "...": "..." },
    "sourceCustomer": { "id": 2, "code": "KH-000002", "name": "Cong ty TNHH ABC (chi nhanh)", "...": "..." },
    "relatedRecordCount": 3
  }
}
```

- `relatedRecordCount`: tổng số bản ghi hiện có của hồ sơ bị gộp (nhật ký khách hàng + lý do bỏ qua cảnh báo
  trùng) sẽ được chuyển về hồ sơ giữ lại khi gộp thật.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Quản trị viên — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `targetCustomerId`/`sourceCustomerId`, hoặc hai giá trị này trùng nhau |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy hồ sơ giữ lại hoặc hồ sơ bị gộp |
| 400 | `INVALID_STATE` | Một trong hai hồ sơ đã ở trạng thái đã gộp từ trước |

#### `POST /customers/merge`

Thực hiện gộp hai hồ sơ (TC-01). Body giống hệt `POST /customers/merge/preview`.

```json
{ "targetCustomerId": 1, "sourceCustomerId": 2 }
```

Luôn thực hiện gộp — **không kiểm tra hay chặn** theo bất kỳ điều kiện nào của dữ liệu liên quan của hồ sơ bị
gộp (ví dụ còn công nợ chưa thanh toán); dữ liệu đó vẫn được chuyển về hồ sơ giữ lại kèm dấu vết nguồn gốc (TC-02).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Gop ho so khach hang thanh cong",
  "data": {
    "id": 1,
    "code": "KH-000001",
    "name": "Cong ty TNHH ABC",
    "taxCode": "0101234567",
    "phone": "0987654321",
    "industry": "Cong nghe thong tin",
    "address": "Ha Noi",
    "createdAt": "2026-08-26T10:00:00",
    "companySize": null,
    "priority": null,
    "status": "ACTIVE",
    "mergedIntoId": null
  }
}
```

`data` là hồ sơ **giữ lại** (không phải hồ sơ vừa bị gộp) sau khi đã nhận dữ liệu.

**Response lỗi:** giống hệt `POST /customers/merge/preview`.

**Lưu ý cho Frontend:**
- Luồng khuyến nghị: người dùng chọn hai hồ sơ nghi trùng (ví dụ từ kết quả `POST /customers/check-duplicate`)
  → gọi `POST /customers/merge/preview` để hiển thị xác nhận → người dùng đồng ý → gọi `POST /customers/merge`.
- Sau khi gộp, hồ sơ bị gộp (`sourceCustomerId`) **không còn dùng được** cho các thao tác nghiệp vụ khác (trạng
  thái chuyển sang đã gộp) — nếu màn hình danh sách khách hàng còn hiển thị hồ sơ này, nên ẩn đi hoặc gắn nhãn
  "đã gộp", không cho thao tác tiếp.
- `GET /customers` (và mọi endpoint trả về `CustomerRes` khác) nay có thêm hai trường `status`
  (`ACTIVE` · `INACTIVE` · `MERGED`) và `mergedIntoId` (id hồ sơ đã nhận dữ liệu khi `status = MERGED`, ngược
  lại `null`) — Frontend dùng trực tiếp hai trường này để gắn nhãn "Đã gộp" và khoá thao tác, không cần tự suy
  luận hay gọi thêm API.
- Không có API "hoàn tác gộp" — cần thao tác thủ công phía dữ liệu nếu gộp nhầm.
- Mọi lần gộp và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký (TC-04) — Frontend không cần gọi
  thêm API nào để việc ghi log này xảy ra.

### `NCL-03-CN-004` — Dự báo doanh thu theo xác suất giai đoạn

Yêu cầu token của **Ban giám đốc** (`VT-01`) hoặc **Nhân viên kinh doanh** (`VT-04`).
API chỉ tính các cơ hội có `status = OPEN` và có `expectedCloseDate`; cơ hội đã
đóng, bao gồm cơ hội `LOST`, và cơ hội chưa có ngày dự kiến ký sẽ được loại khỏi
dự báo (TC-02).

#### `GET /opportunities/revenue-forecast`

Có thể lọc theo khoảng ngày dự kiến ký. Hai tham số đều không bắt buộc và có định
dạng `YYYY-MM-DD`:

| Tham số | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `from` | string (`YYYY-MM-DD`) | không | Tháng bắt đầu, lấy cả tháng chứa ngày này |
| `to` | string (`YYYY-MM-DD`) | không | Tháng kết thúc, lấy cả tháng chứa ngày này |

Mỗi cơ hội được tính vào tháng của `expectedCloseDate` theo công thức:
`expectedValue * probability / 100`. Các cơ hội cùng tháng được cộng dồn; kết
quả sắp xếp theo tháng tăng dần (TC-01). Nếu `probability` là `null`, hệ thống
dùng giá trị `0`.

**Ví dụ:** `GET /opportunities/revenue-forecast?from=2026-09-01&to=2026-12-31`

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "totalExpectedRevenue": 180000000,
    "months": [
      {
        "month": "2026-09",
        "expectedRevenue": 180000000,
        "opportunityCount": 2
      },
      {
        "month": "2026-10",
        "expectedRevenue": 50000000,
        "opportunityCount": 1
      }
    ]
  }
}
```

`totalExpectedRevenue` là tổng `expectedRevenue` của tất cả tháng trong kết quả.
`opportunityCount` đếm số cơ hội mở được đưa vào tháng đó, không phải số cơ hội
đã thắng.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Ban giám đốc hoặc Nhân viên kinh doanh |
| 400 | `VALIDATION_ERROR` | `from` sau `to` hoặc sai định dạng ngày |

API không làm thay đổi dữ liệu cơ hội và không cần endpoint riêng để tính lại; mỗi
lần gọi sẽ đọc stage, status, probability và expected close date hiện tại.

---

## Epic `NCL-03` — Cơ hội bán hàng

### `NCL-03-CN-001` — Tạo cơ hội bán hàng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`); vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần
từ chối (TC-03).

#### `POST /opportunities`

```json
{
  "name": "Trien khai ERP cho Cong ty TNHH ABC",
  "customerId": 1,
  "expectedValue": 500000000,
  "expectedCloseDate": "2026-12-31",
  "ownerId": null
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tên cơ hội, tối đa 255 ký tự — bỏ trống thì bị từ chối |
| `customerId` | number | có | Id khách hàng **đã có hồ sơ** trong hệ thống (`NCL-02-CN-001`) — điều kiện bắt đầu của story (TC-01) |
| `expectedValue` | number | có | Giá trị dự kiến, **phải là số dương** (>0) (TC-02) |
| `expectedCloseDate` | string (`YYYY-MM-DD`) | không | Ngày dự kiến ký/chốt |
| `ownerId` | number | không | Người phụ trách — bỏ trống thì mặc định là người tạo (người đang đăng nhập) |

Cơ hội mới luôn được tạo ở giai đoạn đầu tiên **`APPROACH`** (tiếp cận) và trạng thái **`OPEN`** (QTN-06) —
không truyền lên được, hệ thống tự gán.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Tao co hoi ban hang thanh cong",
  "data": {
    "id": 1,
    "name": "Trien khai ERP cho Cong ty TNHH ABC",
    "customerId": 1,
    "customerName": "Cong ty TNHH ABC",
    "expectedValue": 500000000,
    "expectedCloseDate": "2026-12-31",
    "stage": "APPROACH",
    "status": "OPEN",
    "probability": 10,
    "ownerId": 3,
    "createdBy": "sale01",
    "createdAt": "2026-09-03T10:00:00"
  }
}
```

> `probability` (xác suất trúng %, 0-100) có mặt trên mọi response `OpportunityRes` kể từ `NCL-03-CN-002` — luôn
> được hệ thống tự tính theo `stage` hiện tại (xem bảng ở mục `NCL-03-CN-002` bên dưới), Frontend không tự nhập.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu/để trống `name`, thiếu `customerId`, hoặc `expectedValue` để trống/bằng 0/âm (TC-02) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy hồ sơ khách hàng ứng với `customerId` (TC-01) |

**Lưu ý cho Frontend:**
- Nên tải sẵn danh sách khách hàng (`GET /customers`) để người dùng chọn `customerId` từ danh sách có sẵn,
  tránh nhập tay id.
- `stage`/`status` chỉ hiển thị, không có ô nhập trên form tạo — mọi cơ hội mới đều bắt đầu ở `APPROACH`/`OPEN`.
- Mọi lần tạo và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký (TC-04) — Frontend không cần gọi
  thêm API nào để việc ghi log này xảy ra.
- Chuyển giai đoạn cơ hội (kanban) xem mục `NCL-03-CN-002` bên dưới. Chưa có API xem danh sách/chi tiết cơ hội
  (`GET /opportunities`, `GET /opportunities/{id}`) trong phạm vi Epic `NCL-03` hiện tại.

---

### `NCL-03-CN-002` — Chuyển giai đoạn cơ hội

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) — cùng phân quyền với `NCL-03-CN-001`; vai trò khác nhận
`403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03 dùng chung cơ chế `OpportunityAccessDeniedAspect`).

#### `PATCH /opportunities/{opportunityId}/stage`

```json
{ "targetStage": "PROPOSAL" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `targetStage` | string | có | Một trong `APPROACH` · `PROPOSAL` · `NEGOTIATION` · `WON` · `LOST` |

**Quy tắc chuyển giai đoạn (QTN-06, TC-02):**
- Chỉ được chuyển sang giai đoạn **kế tiếp liền kề** theo đúng thứ tự
  `APPROACH → PROPOSAL → NEGOTIATION → (WON | LOST)` — **không được nhảy cóc** (ví dụ `APPROACH` → `NEGOTIATION`
  hoặc `APPROACH` → `WON` đều bị từ chối) và **không được chuyển lùi**.
- Từ `NEGOTIATION` được chốt sang **`WON`** hoặc **`LOST`** — hai giai đoạn này ngang hàng nhau, không phải bước
  nối tiếp nhau.
- Khi giai đoạn đích là `WON` hoặc `LOST`, hệ thống tự động **đóng cơ hội** (`status` chuyển sang `CLOSED`) —
  sau đó **không thể chuyển giai đoạn tiếp** cho cơ hội này nữa dù gọi lại API (TC-03).

**Xác suất trúng (`probability`) được hệ thống tự cập nhật theo giai đoạn mới (TC-01), không truyền lên được:**

| `stage` | `probability` |
|---|---|
| `APPROACH` | 10 |
| `PROPOSAL` | 40 |
| `NEGOTIATION` | 70 |
| `WON` | 100 |
| `LOST` | 0 |

**Response thành công — `200 OK`:** giống hệt cấu trúc `OpportunityRes` của `POST /opportunities`, với `stage`,
`status`, `probability` đã cập nhật theo giai đoạn mới.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `targetStage` |
| 400 | `INVALID_STATE` | Chuyển giai đoạn không hợp lệ (nhảy cóc/lùi, TC-02) hoặc cơ hội đã đóng (TC-03) — xem `message` để biết giai đoạn hợp lệ kế tiếp |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy cơ hội ứng với `opportunityId` |

#### `GET /opportunities/{opportunityId}/stage-history`

Lịch sử mọi lần chuyển giai đoạn của một cơ hội (TC-05), mới nhất lên đầu.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 2,
      "opportunityId": 1,
      "fromStage": "APPROACH",
      "toStage": "PROPOSAL",
      "changedByUsername": "sale01",
      "changedAt": "2026-09-03T11:00:00"
    },
    {
      "id": 1,
      "opportunityId": 1,
      "fromStage": null,
      "toStage": "APPROACH",
      "changedByUsername": "sale01",
      "changedAt": "2026-09-03T10:00:00"
    }
  ]
}
```

`fromStage` là `null` cho bản ghi đầu tiên (lúc tạo cơ hội, tự động ghi nhận giai đoạn khởi tạo `APPROACH`).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy cơ hội ứng với `opportunityId` |

**Lưu ý cho Frontend:**
- Dùng `PATCH .../stage` để kéo-thả thẻ cơ hội giữa các cột trên bảng Kanban — nếu API trả `400 INVALID_STATE`
  do nhảy cóc/cơ hội đã đóng, nên trả thẻ về cột cũ và hiển thị `message` cho người dùng thay vì tự cho phép di
  chuyển tự do.
- Sau khi cơ hội đạt `WON`/`LOST` (`status = CLOSED`), nên khóa thao tác kéo-thả/đổi giai đoạn trên giao diện,
  không đợi gọi API mới biết bị từ chối.
- Mọi lần chuyển giai đoạn và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký — Frontend không cần
  gọi thêm API nào để việc ghi log này xảy ra.

---

### `NCL-03-CN-003` — Lập báo giá cho cơ hội

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`). Cơ hội phải đang ở giai đoạn
`PROPOSAL`; mỗi lần lập báo giá tạo một phiên bản mới và không ghi đè phiên bản cũ.

#### `POST /opportunities/{opportunityId}/quotes`

```json
{
  "items": [
    { "professionalRole": "Lap trinh vien cao cap", "workDays": 20 },
    { "professionalRole": "Kiem thu", "workDays": 10 }
  ]
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `items` | array | có | Ít nhất một dòng báo giá |
| `items[].professionalRole` | string | có | Vai trò chuyên môn, không để trống |
| `items[].workDays` | number | có | Số ngày công dự kiến, phải lớn hơn 0 |

Backend tra đơn giá bán có `effectiveFrom <= ngày lập`, chọn bản ghi mới nhất của
từng vai trò rồi tính `amount = workDays * dailyRate`. Vai trò chưa có đơn giá
được trả trong `missingRates`, dòng đó có `unitRate: null`, `amount: null` và không
được cộng vào `totalAmount` (TC-02). Đơn giá không nhận từ request.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Lap bao gia thanh cong",
  "data": {
    "id": 1,
    "opportunityId": 12,
    "version": 1,
    "totalAmount": 150000000,
    "items": [
      {
        "professionalRole": "Lap trinh vien cao cap",
        "workDays": 20,
        "unitRate": 5000000,
        "amount": 100000000,
        "priced": true
      }
    ],
    "missingRates": [],
    "createdBy": "sale01",
    "createdAt": "2026-09-03T10:00:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh |
| 400 | `VALIDATION_ERROR` | Không có dòng, vai trò trống hoặc số ngày công không dương |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy cơ hội |
| 400 | `INVALID_STATE` | Cơ hội chưa ở giai đoạn `PROPOSAL` |

Mọi lần lập báo giá được ghi vào nhật ký cơ hội. `version` tăng tuần tự theo từng
cơ hội; phiên bản trước vẫn giữ nguyên để đối chiếu khi khách hàng yêu cầu giảm giá.

**Lưu ý cho Frontend:**
- Chưa có API xem lại các phiên bản báo giá đã lập (`GET .../quotes`) trong phạm vi Epic `NCL-03` hiện tại —
  Frontend cần tự lưu response của lần gọi `POST` gần nhất nếu muốn hiển thị lại trong phiên làm việc.
- Dòng nào rơi vào `missingRates` (chưa có đơn giá hiệu lực cho vai trò đó) vẫn được trả về trong `items` với
  `unitRate`/`amount` là `null` và `priced: false` — nên hiển thị cảnh báo thay vì ẩn dòng, vì dòng đó **không**
  được cộng vào `totalAmount`.
- Mọi lần lập báo giá và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký — Frontend không cần gọi
  thêm API nào để việc ghi log này xảy ra.

---

### `NCL-03-CN-005` — Ghi nhận kết quả thắng thua của cơ hội

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) — cùng phân quyền với `NCL-03-CN-001`/`002`; vai trò khác
nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03, dùng chung cơ chế `OpportunityAccessDeniedAspect`).

#### `POST /opportunities/{opportunityId}/close`

Điều kiện bắt đầu: **cơ hội phải đang ở giai đoạn đàm phán (`NEGOTIATION`)** — dùng chung luật thứ tự giai đoạn
với `NCL-03-CN-002` (QTN-06: chỉ từ `NEGOTIATION` mới được chốt sang `WON`/`LOST`). Đây là API **chuyên dụng** để
đóng cơ hội kèm ghi nhận lý do — khác với `PATCH .../stage` (dùng cho kéo-thả Kanban qua các giai đoạn trung
gian), API này **bắt buộc** phải nhập lý do khi kết quả là thua.

```json
{
  "result": "LOST",
  "lossReason": "PRICE_TOO_HIGH",
  "reasonDetail": "Gia cao hon doi thu 15%",
  "competitorName": "Cong ty XYZ"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `result` | string | có | Chỉ chấp nhận `WON` hoặc `LOST` — giá trị khác (`APPROACH`/`PROPOSAL`/`NEGOTIATION`) bị từ chối |
| `lossReason` | string | **có, chỉ khi `result = LOST`** | Một trong `PRICE_TOO_HIGH` · `LOST_TO_COMPETITOR` · `BUDGET_CUT` · `TIMING_NOT_RIGHT` · `REQUIREMENT_MISMATCH` · `NO_RESPONSE` · `OTHER` — để trống khi thua bị từ chối (TC-02). Bỏ qua/không lưu khi `result = WON` |
| `reasonDetail` | string | không | Ghi chú chi tiết thêm (tối đa 500 ký tự), dùng được cho cả hai kết quả |
| `competitorName` | string | không | Tên đối thủ cạnh tranh nếu có (tối đa 255 ký tự) |

Khi đóng thành công, hệ thống tự động: cập nhật `stage` = `result`, `status` = `CLOSED`, `probability` = `100`
(nếu `WON`) hoặc `0` (nếu `LOST`) — giống bảng xác suất ở mục `NCL-03-CN-002`; ghi thêm một bản ghi vào lịch sử
chuyển giai đoạn (`GET .../stage-history`, `fromStage = NEGOTIATION`); và ghi nhật ký riêng `CLOSE_WON`/`CLOSE_LOST`
kèm lý do/đối thủ (TC-04). Sau khi đóng, cơ hội **không thể mở lại hay đóng lần nữa** (gọi lại API này hay
`PATCH .../stage` đều bị từ chối `INVALID_STATE`, giống `NCL-03-CN-002` TC-03).

**Response thành công — `200 OK`:** giống cấu trúc `OpportunityRes` của `POST /opportunities`, có thêm 4 trường
mới (luôn có mặt trên `OpportunityRes` kể từ story này, `null` nếu cơ hội chưa đóng hoặc không nhập):

```json
{
  "success": true,
  "message": "Ghi nhan ket qua co hoi thanh cong",
  "data": {
    "id": 12,
    "name": "Trien khai ERP cho Cong ty TNHH ABC",
    "customerId": 1,
    "customerName": "Cong ty TNHH ABC",
    "expectedValue": 500000000,
    "expectedCloseDate": "2026-12-31",
    "stage": "LOST",
    "status": "CLOSED",
    "probability": 0,
    "ownerId": 3,
    "createdBy": "sale01",
    "createdAt": "2026-09-01T10:00:00",
    "lossReason": "PRICE_TOO_HIGH",
    "closeReasonDetail": "Gia cao hon doi thu 15%",
    "competitorName": "Cong ty XYZ",
    "closedAt": "2026-09-03T15:30:00"
  }
}
```

| Trường mới trong `OpportunityRes` | Kiểu | Ghi chú |
|---|---|---|
| `lossReason` | string \| null | Chỉ có giá trị khi `stage = LOST`, luôn `null` khi `stage = WON` hoặc cơ hội chưa đóng |
| `closeReasonDetail` | string \| null | Ghi chú chi tiết đã nhập lúc đóng, `null` nếu không nhập |
| `competitorName` | string \| null | Tên đối thủ đã nhập lúc đóng, `null` nếu không nhập |
| `closedAt` | string (ISO datetime) \| null | Thời điểm đóng cơ hội, `null` nếu cơ hội còn đang mở |

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `result`, hoặc `result` không phải `WON`/`LOST`, hoặc `result = LOST` mà thiếu `lossReason` (TC-02) |
| 400 | `INVALID_STATE` | Cơ hội chưa ở giai đoạn `NEGOTIATION` (điều kiện bắt đầu của story), hoặc cơ hội đã đóng từ trước — không cho đóng lại |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy cơ hội ứng với `opportunityId` |

**Lưu ý cho Frontend:**
- Chỉ mở nút "Ghi nhận kết quả thắng/thua" khi cơ hội đang ở giai đoạn `NEGOTIATION` (kiểm tra `stage` trên dữ
  liệu đang có) — tránh gọi API rồi mới biết bị từ chối `INVALID_STATE`.
- Khi người dùng chọn kết quả **Thua**, bắt buộc hiển thị ô chọn `lossReason` (dropdown theo danh sách 7 giá trị
  ở trên) là trường bắt buộc trên form trước khi cho xác nhận — form không nên tự gọi API nếu ô này còn trống,
  dù backend cũng chặn lại (TC-02).
- Khi chọn kết quả **Thắng**, ẩn ô `lossReason` (không cần nhập) nhưng vẫn có thể để người dùng ghi `reasonDetail`
  (vd: "thắng nhờ giá tốt hơn") và `competitorName` nếu muốn lưu lại phục vụ báo cáo.
- Sau khi đóng thành công, khóa mọi thao tác đổi giai đoạn/đóng lại trên giao diện của cơ hội đó, tương tự lưu ý
  ở mục `NCL-03-CN-002`.
- Mọi lần đóng cơ hội và mọi lần bị từ chối truy cập đều được backend tự ghi nhật ký — Frontend không cần gọi
  thêm API nào để việc ghi log này xảy ra.

---

### `NCL-03-CN-006` — Ghi nhận hoạt động chăm sóc cơ hội

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) — cùng phân quyền với `NCL-03-CN-001`/`002`/`005`; vai trò
khác nhận `403 FORBIDDEN` cho **cả hai** endpoint dưới đây, bị ghi nhật ký lần từ chối (TC-03, dùng chung cơ chế
`OpportunityAccessDeniedAspect`).

> Cơ hội dùng để thử hai endpoint dưới đây có thể tạo qua `POST /opportunities` (`NCL-03-CN-001`), hoặc dùng id
> cơ hội mẫu đã seed sẵn: `2001` (gắn khách hàng `1001`, chủ `sale01`) hoặc `2002` (gắn khách hàng `1003`, chủ
> `sale.lead`).

#### `GET /opportunities/{opportunityId}/activities`

Dòng thời gian chăm sóc của một cơ hội — hoạt động có **thời điểm diễn ra** (`occurredAt`) gần nhất hiện ở đầu
danh sách. Luôn xem được, **kể cả khi cơ hội đã đóng** (TC-02 chỉ chặn thao tác thêm mới).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "opportunityId": 2001,
      "activityType": "MEETING",
      "occurredAt": "2026-01-12T09:30:00",
      "participants": "sale01, anh Minh (khach hang), anh Tuan (khach hang)",
      "content": "Hop demo truc tiep tai van phong khach hang, hen gui bao gia truoc 20/01.",
      "createdBy": "sale01",
      "createdAt": "2026-01-12T11:00:00"
    },
    {
      "id": 1,
      "opportunityId": 2001,
      "activityType": "CALL",
      "occurredAt": "2026-01-06T14:00:00",
      "participants": "sale01, chi Lan (khach hang)",
      "content": "Goi gioi thieu giai phap CRM, khach hang quan tam module bao gia tu dong.",
      "createdBy": "sale01",
      "createdAt": "2026-01-06T14:05:00"
    }
  ]
}
```

#### `POST /opportunities/{opportunityId}/activities`

```json
{
  "activityType": "CALL",
  "occurredAt": "2026-01-06T14:00:00",
  "participants": "sale01, chi Lan (khach hang)",
  "content": "Goi gioi thieu giai phap CRM, khach hang quan tam module bao gia tu dong."
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `activityType` | string | có | Một trong `CALL` (gọi điện) · `MEETING` (gặp mặt) · `EMAIL` (thư điện tử) · `NOTE` (ghi chú khác) |
| `occurredAt` | string (ISO-8601 `date-time`) | có | Thời điểm hoạt động **diễn ra** — có thể nhập bù một cuộc gọi/cuộc gặp đã xảy ra trước đó, khác với thời điểm ghi nhận vào hệ thống (`createdAt`, do máy chủ tự sinh) |
| `participants` | string | không | Người tham gia, dạng văn bản tự do, tối đa 500 ký tự |
| `content` | string | có | Nội dung trao đổi, tối đa 2000 ký tự — bỏ trống (hoặc toàn khoảng trắng) thì bị từ chối |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Ghi nhan hoat dong cham soc thanh cong",
  "data": {
    "id": 3,
    "opportunityId": 2001,
    "activityType": "CALL",
    "occurredAt": "2026-01-06T14:00:00",
    "participants": "sale01, chi Lan (khach hang)",
    "content": "Goi gioi thieu giai phap CRM, khach hang quan tam module bao gia tu dong.",
    "createdBy": "sale01",
    "createdAt": "2026-01-15T10:20:31"
  }
}
```

**Response lỗi (áp dụng cho cả hai endpoint trên):**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh (`VT-04`) — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `activityType`/`occurredAt`, hoặc `content` để trống |
| 400 | `INVALID_STATE` | Chỉ ở `POST`: cơ hội **đã đóng** (`status = CLOSED`, tức đã `WON` hoặc `LOST`) — chỉ còn xem lại lịch sử, không thêm được hoạt động mới (TC-02) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy `opportunityId` |

**Lưu ý cho Frontend:**
- Trên màn hình chi tiết cơ hội, hiển thị dòng thời gian (`GET`) theo thứ tự trả về (mới nhất trước) — không cần
  tự sắp xếp lại.
- Khi cơ hội đã đóng (`status = CLOSED`, xem `NCL-03-CN-002`/`005`), vẫn gọi `GET` bình thường để hiển thị lịch
  sử, nhưng nên **ẩn/khoá nút "Thêm hoạt động"** trên giao diện dựa vào trạng thái cơ hội đã biết trước (tránh
  gọi `POST` rồi mới nhận `400 INVALID_STATE`); nếu vẫn gọi và nhận lỗi này, hiển thị đúng thông điệp trả về.
- Mọi lần thêm hoạt động thành công đều được backend tự ghi vào nhật ký cơ hội (TC-04) — Frontend không cần gọi
  thêm API nào để việc ghi log này xảy ra.

---

### `NCL-03-CN-007` — Báo cáo đường ống bán hàng theo giai đoạn

Yêu cầu token của **Ban giám đốc** (`VT-01`) hoặc **Nhân viên kinh doanh** (`VT-04`) — cùng phạm vi phân quyền
với báo cáo dự báo doanh thu `NCL-03-CN-004`. Vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối
(TC-03, dùng chung cơ chế `OpportunityAccessDeniedAspect`). Mỗi lần gọi thành công, backend ghi một dòng
`REPORT_VIEW` vào nhật ký cơ hội (`opportunity_audit_logs`) — người thực hiện, nội dung tóm tắt, thời điểm
(TC-04); Frontend không cần gọi thêm API nào để việc ghi log này xảy ra.

#### `GET /opportunities/pipeline-report`

Không có tham số. Báo cáo là ảnh chụp **hiện tại** của toàn bộ cơ hội, gom theo `stage`.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "totalOpportunityCount": 12,
    "totalExpectedValue": 3150000000,
    "stalledThresholdDays": 60,
    "generatedAt": "2026-09-04T11:20:31",
    "stages": [
      { "stage": "APPROACH",    "opportunityCount": 4, "totalExpectedValue": 700000000,  "averageDaysInStage": 18, "stalledCount": 0, "stalledOpportunityIds": [] },
      { "stage": "PROPOSAL",    "opportunityCount": 3, "totalExpectedValue": 900000000,  "averageDaysInStage": 25, "stalledCount": 0, "stalledOpportunityIds": [] },
      { "stage": "NEGOTIATION", "opportunityCount": 2, "totalExpectedValue": 800000000,  "averageDaysInStage": 47, "stalledCount": 1, "stalledOpportunityIds": [2007] },
      { "stage": "WON",         "opportunityCount": 2, "totalExpectedValue": 600000000,  "averageDaysInStage": 5,  "stalledCount": 0, "stalledOpportunityIds": [] },
      { "stage": "LOST",        "opportunityCount": 1, "totalExpectedValue": 150000000,  "averageDaysInStage": 3,  "stalledCount": 0, "stalledOpportunityIds": [] }
    ]
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `totalOpportunityCount` | number | Tổng số cơ hội đưa vào báo cáo (mọi trạng thái). |
| `totalExpectedValue` | number | Tổng `expectedValue` của tất cả cơ hội. |
| `stalledThresholdDays` | number | Ngưỡng (ngày) để coi một cơ hội còn mở là "đọng lâu bất thường" — hiện cố định `60` (TC-02). |
| `generatedAt` | string (`date-time`) | Thời điểm máy chủ sinh báo cáo — cũng là mốc tính `averageDaysInStage`. |
| `stages` | array | **Luôn đủ 5 dòng** theo đúng thứ tự `APPROACH → PROPOSAL → NEGOTIATION → WON → LOST`; giai đoạn không có cơ hội trả về các số `0` / mảng rỗng (không bị bỏ khỏi danh sách). |
| `stages[].opportunityCount` | number | Số cơ hội đang ở giai đoạn đó (TC-01). |
| `stages[].totalExpectedValue` | number | Tổng giá trị dự kiến của các cơ hội trong giai đoạn (TC-01). |
| `stages[].averageDaysInStage` | number | Số ngày trung bình (làm tròn) mỗi cơ hội đã nằm ở giai đoạn hiện tại; `0` khi không có cơ hội. Mốc bắt đầu là lần **chuyển vào** giai đoạn hiện tại (bản ghi `opportunity_stage_history` mới nhất có `toStage` = giai đoạn hiện tại), hoặc `createdAt` nếu cơ hội chưa từng chuyển giai đoạn (TC-01). |
| `stages[].stalledCount` | number | Số cơ hội còn mở (`status = OPEN`) ở giai đoạn trung gian đã nằm **quá** `stalledThresholdDays` ngày (TC-02). Giai đoạn `WON`/`LOST` luôn `0`. |
| `stages[].stalledOpportunityIds` | array<number> | Id các cơ hội bị đánh dấu đọng lâu, để giao diện mở tầng chi tiết (TC-02). |

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Ban giám đốc (`VT-01`) hoặc Nhân viên kinh doanh (`VT-04`) — hệ thống ghi nhật ký lần từ chối (TC-03) |

**Lưu ý cho Frontend:**
- API là ảnh chụp hiện tại; không có tham số lọc theo khoảng ngày trong phạm vi story này.
- Vẽ phễu (funnel) theo đúng thứ tự `stages` trả về; hiển thị cảnh báo "đọng lâu bất thường" cho các giai đoạn
  có `stalledCount > 0`, dùng `stalledOpportunityIds` để liên kết tới chi tiết cơ hội.
- Cột giá trị dùng chung đơn vị tiền với các API cơ hội khác (VND, số nguyên).

---

## Epic `NCL-05` — Quản lý dự án

### `NCL-05-CN-001` — Tạo dự án từ hợp đồng

Yêu cầu token của **Quản lý dự án** (`VT-02`). Hệ thống chỉ cho phép tạo dự án từ hợp đồng đang còn hiệu lực
(`status = ACTIVE` và chưa quá `endDate`). Dự án mới luôn ở trạng thái `RUNNING`, tự kế thừa `customerId`,
loại hợp đồng (`projectType`) và hạn mức (`limitValue`) tại thời điểm tạo. Thao tác thành công ghi một dòng
`CREATE_FROM_CONTRACT` vào `project_audit_logs`; trường hợp bị từ chối quyền được ghi vào nhật ký hệ thống.

#### `POST /contracts/{contractId}/projects`

```json
{
  "name": "Trien khai ERP Cong ty TNHH ABC",
  "startDate": "2027-01-01",
  "expectedEndDate": "2027-12-31",
  "projectManagerId": 7
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tên dự án, không được rỗng |
| `startDate` | string (`date`) | có | Ngày bắt đầu dự án |
| `expectedEndDate` | string (`date`) | có | Không được sớm hơn `startDate` |
| `projectManagerId` | number | có | Người dùng đang hoạt động được giao quản lý dự án |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Tao du an tu hop dong thanh cong",
  "data": {
    "id": 20,
    "projectCode": "DA-4K7X2Q9",
    "name": "Trien khai ERP Cong ty TNHH ABC",
    "contractId": 5,
    "customerId": 1,
    "projectType": "FIXED_PRICE",
    "limitValue": 600000000,
    "startDate": "2027-01-01",
    "expectedEndDate": "2027-12-31",
    "projectManagerId": 7,
    "status": "RUNNING",
    "createdBy": "pm01",
    "createdAt": "2026-09-09T10:00:00"
  }
}
```

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải `VT-02`; hệ thống ghi nhật ký lần từ chối |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng hoặc người quản lý dự án |
| 400 | `INVALID_STATE` | Hợp đồng không `ACTIVE`, đã quá hạn, hoặc ngày kết thúc dự kiến sớm hơn ngày bắt đầu |
| 400 | `VALIDATION_ERROR` | Thiếu tên, ngày bắt đầu, ngày kết thúc dự kiến hoặc người quản lý dự án |

#### Đọc dự án (bổ trợ cho Frontend)

Các màn hình con của Epic `NCL-05` (cây công việc, mốc tiến độ, rủi ro, đóng dự án) đều nằm dưới
`/projects/{projectId}` và cần tối thiểu `status` của dự án để khoá/mở nút chỉnh sửa. Hai endpoint đọc:

##### `GET /projects/{projectId}`

Cho phép **Ban giám đốc** (`VT-01`), **Quản lý dự án** (`VT-02`), **Nhân viên chuyên môn** (`VT-03`).
Trả về một `ProjectRes` (cùng khuôn dạng `data` như response của `POST /contracts/{contractId}/projects`).

##### `GET /contracts/{contractId}/projects`

Cùng tập vai trò như trên. Trả về `List<ProjectRes>` các dự án của hợp đồng, **mới nhất trước**
(mảng rỗng nếu hợp đồng chưa có dự án).

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Người gọi không thuộc `VT-01` / `VT-02` / `VT-03`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án với `{projectId}` (chỉ với `GET /projects/{projectId}`). |

### `NCL-05-CN-007` — Tạo dự án từ mẫu công việc

Yêu cầu token của **Quản lý dự án** (`VT-02`) — vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối
(TC-03). Người dùng chọn một **mẫu dự án** đang hoạt động (cây hạng mục + công việc có sẵn kèm ngân sách giờ
gợi ý) để tạo dự án mới từ hợp đồng còn hiệu lực. Hệ thống **sao chép giá trị** (copy-value) từ mẫu sang cây
công việc của dự án: sau khi tạo, sửa/xóa hạng mục trên dự án **không** ảnh hưởng đến mẫu gốc (TC-02). Dự án
mới ở trạng thái `RUNNING`, kế thừa `customerId`, `projectType`, `limitValue` từ hợp đồng. Tạo thành công ghi
một dòng `CREATE_FROM_TEMPLATE` vào `project_audit_logs` — người thực hiện, nội dung, thời điểm (TC-04);
Frontend không cần gọi API nào thêm để ghi log này.

#### `GET /contracts/{contractId}/projects/from-template`

Trả về danh sách mẫu dự án đang hoạt động để người dùng chọn. Chỉ `VT-02`.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 5,
      "code": "MT-PHAN-MEM",
      "name": "Mau trien khai phan mem",
      "description": "Cay hang muc chuan cho du an trien khai phan mem",
      "projectType": "FIXED_PRICE",
      "active": true,
      "createdBy": "admin",
      "createdAt": "2026-09-01T08:00:00"
    }
  ]
}
```

#### `POST /contracts/{contractId}/projects/from-template`

```json
{
  "templateId": 5,
  "name": "Du an ERP Cong ty TNHH ABC",
  "startDate": "2027-01-01",
  "expectedEndDate": "2027-12-31",
  "projectManagerId": 7
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `templateId` | number | có | Id mẫu dự án đang hoạt động |
| `name` | string | có | Tên dự án mới, không được rỗng |
| `startDate` | string (`date`) | có | Ngày bắt đầu dự án; công việc trong cây nhận giá trị này làm ngày dự kiến |
| `expectedEndDate` | string (`date`) | có | Không được sớm hơn `startDate` |
| `projectManagerId` | number | có | Người dùng đang hoạt động được giao quản lý dự án |

**Response thành công — `200 OK`:** giống `POST /contracts/{contractId}/projects` (`NCL-05-CN-001`) — object
dự án vừa tạo trong `data`.

**Xóa hạng mục của dự án (TC-02):** `DELETE /projects/{projectId}/work-packages/{workPackageId}` — chỉ
`VT-02`. Chỉ xóa được hạng mục **không còn hạng mục con và không còn công việc**, khi dự án chưa đóng.
Thành công trả `200 OK` với `message = "Xoa hang muc thanh cong"`; vi phạm trả `400 INVALID_STATE`.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải `VT-02`; hệ thống ghi nhật ký lần từ chối |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng, mẫu dự án hoặc người quản lý |
| 400 | `INVALID_STATE` | Hợp đồng không `ACTIVE`/đã quá hạn, mẫu không hoạt động, ngày kết thúc sớm hơn ngày bắt đầu, hoặc hạng mục không xóa được |
| 400 | `VALIDATION_ERROR` | Thiếu trường bắt buộc |

## Epic `NCL-04` — Quản lý hợp đồng
## Epic `NCL-04` — Quản lý hợp đồng

### `NCL-04-CN-001` — Tạo hợp đồng từ cơ hội đã thắng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`) — vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần
từ chối (TC-03, dùng chung cơ chế `OpportunityAccessDeniedAspect` vì endpoint nằm trong module cơ hội).
Áp dụng quy tắc **QTN-08: hợp đồng chỉ tạo được từ cơ hội đã thắng (`stage = WON`)** (TC-02).

Máy chủ **tự động dựng sẵn** hợp đồng từ cơ hội: `customerId` (khách hàng của cơ hội), giá trị (lấy
`totalAmount` của **báo giá version mới nhất**), và ghi nguồn (`quoteId`) để truy ngược về phía bán hàng.
Frontend chỉ gửi các trường người dùng bổ sung; **không** chấp nhận `customerId`/`quoteId` từ client để tránh
sai lệch dữ liệu bán hàng. Hợp đồng mới luôn ở trạng thái `DRAFT` và được **liên kết ngược về cơ hội** qua
`opportunityId` — mỗi cơ hội thắng chỉ tạo được **một** hợp đồng (UNIQUE ở DB, kiểm trước ở tầng service).
Tạo thành công sẽ ghi một dòng `CONTRACT_CREATE` vào nhật ký cơ hội — người thực hiện, nội dung, thời điểm
(TC-04); Frontend không cần gọi API nào thêm để ghi log này.

#### `POST /opportunities/{opportunityId}/contract`

```json
{
  "name": "Hop dong trien khai ERP Cong ty TNHH ABC",
  "contractType": "FIXED_PRICE",
  "totalValue": 500000000,
  "startDate": "2026-10-01",
  "endDate": "2027-09-30",
  "notes": "Tra theo 3 cot moc nghiem thu"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | không | Tên hợp đồng (tối đa 255 ký tự); bỏ trống thì lấy tên cơ hội |
| `contractType` | string | có | Một trong `TIME_AND_MATERIAL` · `FIXED_PRICE` · `MAINTENANCE` |
| `totalValue` | number | không | Giá trị hợp đồng tự điều chỉnh; bỏ trống thì dùng `totalAmount` của báo giá mới nhất |
| `startDate` | string (`date`) | không | Ngày bắt đầu hiệu lực; có thể bổ sung sau ở bước hoàn thiện hợp đồng |
| `endDate` | string (`date`) | không | Phải **không sớm hơn** `startDate` nếu cả hai đều gửi |
| `notes` | string | không | Ghi chú/nội dung bổ sung (tối đa 1000 ký tự) |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Tao hop dong tu co hoi thanh cong",
  "data": {
    "id": 5,
    "contractCode": "HD-4K7X2Q9",
    "name": "Trien khai ERP cho Cong ty TNHH ABC",
    "opportunityId": 12,
    "customerId": 1,
    "customerName": "Cong ty TNHH ABC",
    "quoteId": 30,
    "contractType": "FIXED_PRICE",
    "totalValue": 500000000,
    "startDate": "2026-10-01",
    "endDate": "2027-09-30",
    "status": "DRAFT",
    "notes": "Tra theo 3 cot moc nghiem thu",
    "createdBy": "sale01",
    "createdAt": "2026-09-07T10:15:00"
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | number | Id hợp đồng vừa tạo. |
| `contractCode` | string | Mã hợp đồng duy nhất, sinh tự động (tiền tố `HD-`). |
| `opportunityId` | number \| null | **Liên kết ngược về cơ hội gốc** — luôn có giá trị với hợp đồng tạo từ cơ hội (TC-01). |
| `customerId` / `customerName` | number / string | Khách hàng lấy từ cơ hội; tên để hiển thị. |
| `quoteId` | number \| null | Báo giá version mới nhất dùng dựng hợp đồng (truy nguồn bán hàng). |
| `totalValue` | number | Giá trị hợp đồng = `totalValue` người dùng nhập nếu có, ngược lại `totalAmount` của báo giá. |
| `status` | string | Luôn `DRAFT` ngay sau khi tạo; hợp đồng "dựng sẵn, chờ bổ sung". |
| `createdBy` / `createdAt` | string / `date-time` | Người thực hiện và thời điểm tạo (TC-04). |

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh (`VT-04`) — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại cơ hội với `{opportunityId}` |
| 400 | `INVALID_STATE` | Cơ hội chưa ở giai đoạn `WON` — "yêu cầu cập nhật kết quả cơ hội trước" (TC-02); **hoặc** cơ hội đã có hợp đồng; **hoặc** `endDate` sớm hơn `startDate` |
| 400 | `VALIDATION_ERROR` | Thiếu `contractType`, tên/ghi chú vượt quá độ dài cho phép; **hoặc** cơ hội thắng chưa có báo giá nào để dựng giá trị |

**Lưu ý cho Frontend:**
- Chỉ hiển thị nút "Tạo hợp đồng" khi `opportunity.stage === 'WON'` và chưa có hợp đồng liên kết (TC-02);
  với cơ hội chưa thắng, vô hiệu nút và hướng dẫn cập nhật kết quả cơ hội trước.
- Sau khi tạo thành công, điều hướng sang màn hình chi tiết hợp đồng (trạng thái `DRAFT`) để người dùng
  hoàn thiện thông tin; hợp đồng này là đầu vào cho tính năng mở dự án (story sau của Epic NCL-04).
- Lỗi `INVALID_STATE` hiển thị đúng `message` trả về từ backend (đã diễn giải rõ nguyên nhân: chưa thắng /
  đã có hợp đồng / sai ngày).

---

### `NCL-04-CN-002` — Khai báo loại hợp đồng và hạn mức

Yêu cầu token của **Kế toán** (`VT-05`) — vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối vào
`contract_audit_logs` (TC-03, `ContractAccessDeniedAspect`). Điều kiện bắt đầu: hợp đồng đã được tạo (xem
`NCL-04-CN-001`).

Áp dụng **QTN-19**: hạn mức trần (nếu khai báo) không được âm và không được nhỏ hơn giá trị hợp đồng sau khi
điều chỉnh — nếu không hệ thống từ chối lưu (TC-02). `limitValue = null` nghĩa là **không đặt hạn mức** ("nếu
có" theo user story), không phải `0`. Khai báo thành công ghi một dòng `TYPE_LIMIT_UPDATE` vào nhật ký hợp đồng
— người thực hiện, nội dung (loại/giá trị/hạn mức cũ-mới), thời điểm (TC-04); Frontend không cần gọi thêm API
nào để việc ghi log này xảy ra.

> **Lối vào cho Kế toán.** Kế toán (`VT-05`) **không** có quyền vào hồ sơ tổng hợp khách hàng
> (`GET /customers/{id}/overview` chỉ cho `VT-04`/`VT-02`), nên không thể lấy hợp đồng từ màn hình khách hàng.
> Frontend dựng một màn hình **"Hợp đồng"** riêng cho `VT-05`, lấy danh sách từ `GET /contracts` bên dưới rồi
> mở các thao tác `NCL-04-CN-002/003/005/006` ngay trên từng dòng.

#### `GET /contracts`

Danh sách toàn bộ hợp đồng, hợp đồng tạo gần nhất đứng trước. Yêu cầu token của **Kế toán** (`VT-05`) — vai trò
khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối (`ContractAccessDeniedAspect`). `VT-05` có phạm vi dữ
liệu `COMPANY` nên thấy mọi hợp đồng của công ty.

**Response thành công — `200 OK`:** `data` là mảng `ContractRes` (cùng cấu trúc từng phần tử như response của
`GET /contracts/{contractId}` / `PATCH` bên dưới, gồm `limitValue: number | null` và `customerName` để hiển thị).

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) — hệ thống ghi nhật ký lần từ chối |

**Lưu ý cho Frontend:**
- Đây là nguồn dữ liệu cho màn hình "Hợp đồng" của Kế toán. Lọc theo trạng thái / từ khóa làm ở phía client.
- Bấm một dòng để mở `PATCH /contracts/{id}/type-limit` (khai báo loại & hạn mức), `PUT /contracts/{id}/milestones`
  (mốc thanh toán), `POST /contracts/{id}/activate` (kích hoạt), `GET /contracts/{id}/usage` (cảnh báo hạn mức).

#### `GET /contracts/{contractId}`

Trả về chi tiết hợp đồng hiện tại — Frontend gọi API này trước khi mở màn hình khai báo để nạp
sẵn `contractType`/`totalValue`/`limitValue` đang có, tránh gửi đè giá trị sai lên `PATCH` bên dưới.
Cùng cấu trúc `ContractRes` như response thành công của `PATCH` bên dưới.

**Xác thực:** token của **Kế toán** (`VT-05`), **Nhân viên kinh doanh** (`VT-04`) hoặc **Quản lý dự án**
(`VT-02`). VT-04 cần API này để nạp hợp đồng trước khi lập **phụ lục điều chỉnh** (`NCL-04-CN-004`) hoặc
**gia hạn** (`NCL-04-CN-007`) từ hồ sơ tổng hợp khách hàng; VT-02 khi thao tác từ cùng màn hình đó. Đây
chỉ là đọc chi tiết một hợp đồng mà các vai trò này đều đã thấy tóm tắt (ở hồ sơ khách hàng hoặc màn
hình "Hợp đồng"). Vai trò khác nhận `403 FORBIDDEN`.

#### `PATCH /contracts/{contractId}/type-limit`

```json
{
  "contractType": "TIME_AND_MATERIAL",
  "totalValue": 500000000,
  "limitValue": 600000000
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `contractType` | string | có | Một trong `TIME_AND_MATERIAL` · `FIXED_PRICE` · `MAINTENANCE` · `MILESTONE` (TC-01) |
| `totalValue` | number | không | Điều chỉnh giá trị hợp đồng; bỏ trống thì **giữ nguyên** giá trị hiện tại của hợp đồng; không được âm |
| `limitValue` | number | không | Hạn mức trần xuất hóa đơn; bỏ trống = không đặt hạn mức; không được âm và không được nhỏ hơn giá trị hợp đồng (đã điều chỉnh nếu có) — QTN-19 (TC-02) |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Khai bao loai hop dong va han muc thanh cong",
  "data": {
    "id": 5,
    "contractCode": "HD-4K7X2Q9",
    "name": "Hop dong ERP",
    "opportunityId": 12,
    "customerId": 1,
    "customerName": "Cong ty TNHH ABC",
    "quoteId": 30,
    "contractType": "TIME_AND_MATERIAL",
    "totalValue": 500000000,
    "limitValue": 600000000,
    "startDate": "2026-10-01",
    "endDate": "2027-09-30",
    "status": "DRAFT",
    "notes": null,
    "createdBy": "ke_toan01",
    "createdAt": "2026-09-07T10:15:00"
  }
}
```

Cùng cấu trúc `ContractRes` của `NCL-04-CN-001`, thêm `limitValue` (`number | null`).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) — hệ thống ghi nhật ký lần từ chối (TC-03) |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng với `{contractId}` |
| 400 | `VALIDATION_ERROR` | Thiếu `contractType`; `totalValue`/`limitValue` âm; **hoặc** hạn mức nhỏ hơn giá trị hợp đồng (TC-02, QTN-19) |

**Lưu ý cho Frontend:**
- Chỉ hiển thị màn hình này cho tài khoản Kế toán; các vai trò khác không nên thấy nút vào chức năng (dù backend
  đã tự chặn 403, ẩn ở giao diện giúp trải nghiệm rõ ràng hơn).
- Gọi `GET /contracts/{contractId}` để nạp giá trị hiện tại trước khi mở form — không tự suy đoán/mặc định
  `contractType` hay `limitValue`, vì gửi nhầm giá trị mặc định lên `PATCH` sẽ ghi đè dữ liệu thật đã khai báo.
- Khi để trống ô hạn mức, gửi `limitValue: null` (hoặc bỏ trường) — không gửi `0`, vì `0` sẽ luôn bị từ chối
  (nhỏ hơn giá trị hợp đồng khác 0) trừ khi hợp đồng có giá trị bằng 0.
- Lỗi `VALIDATION_ERROR` do vượt hạn mức nên hiển thị đúng `message` backend trả về (đã nêu rõ là do QTN-19) và
  gợi ý người dùng tăng hạn mức hoặc giảm giá trị hợp đồng.

### `NCL-04-CN-003` — Quản lý mốc thanh toán của hợp đồng

Yêu cầu token của **Kế toán** (`VT-05`). Hệ thống lưu lại toàn bộ danh sách mốc
thanh toán và chỉ chấp nhận khi tổng số tiền các mốc bằng đúng `totalValue` của
hợp đồng (TC-01, TC-02, QTN-19). Mỗi mốc có thể khai báo theo tỷ lệ phần trăm
hoặc số tiền; nếu gửi cả hai, số tiền phải khớp với tỷ lệ.

#### `GET /contracts/{contractId}/milestones`

Trả về danh sách mốc theo ngày dự kiến tăng dần. Mốc mới có trạng thái `PENDING`;
các trạng thái `READY_TO_INVOICE` và `INVOICED` dành cho các story nghiệm thu và
hóa đơn tiếp theo.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 101,
      "contractId": 5,
      "name": "Nghiem thu giai doan 1",
      "percentage": 30.00,
      "amount": 300000000,
      "expectedDate": "2026-11-30",
      "acceptanceCondition": "Khach hang ky bien ban nghiem thu",
      "status": "PENDING",
      "createdBy": "ketoan01"
    }
  ]
}
```

#### `PUT /contracts/{contractId}/milestones`

Thay thế toàn bộ danh sách mốc của hợp đồng trong một giao dịch. Gửi mảng rỗng
hoặc tổng khác giá trị hợp đồng sẽ bị từ chối và không thay đổi dữ liệu cũ.

**Request:**

```json
[
  {
    "name": "Nghiem thu giai doan 1",
    "percentage": 30,
    "expectedDate": "2026-11-30",
    "acceptanceCondition": "Khach hang ky bien ban nghiem thu"
  },
  {
    "name": "Ban giao va quyet toan",
    "percentage": 70,
    "expectedDate": "2027-03-31",
    "acceptanceCondition": "Hoan tat ban giao"
  }
]
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tên mốc, không được để trống. |
| `percentage` | number | không | Từ `0.01` đến `100`; backend tính `amount` theo giá trị hợp đồng. |
| `amount` | number | không | Số tiền dương; dùng thay cho `percentage` hoặc gửi đồng thời để đối chiếu. |
| `expectedDate` | date | không | Ngày dự kiến thanh toán. |
| `acceptanceCondition` | string | không | Điều kiện nghiệm thu, tối đa 1000 ký tự. |

**Response thành công — `200 OK`:** `data` là danh sách mốc đã lưu, cùng cấu
trúc từng phần tử như response của `GET`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi `DENIED_ACCESS`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng với `{contractId}`. |
| 400 | `VALIDATION_ERROR` | Mảng rỗng, thiếu tỷ lệ/số tiền, số tiền không hợp lệ, tỷ lệ không khớp số tiền hoặc tổng mốc khác `totalValue`. |
| 400 | `INVALID_STATE` | Hợp đồng đã có mốc `INVOICED` (đã lập hóa đơn, `NCL-10-CN-002`) — không được khai báo lại danh sách mốc. |

#### `PATCH /contracts/{contractId}/milestones/{milestoneId}/status`

Đổi trạng thái một mốc. Chỉ đi **đúng một bước tiến** theo trình tự `PENDING` → `READY_TO_INVOICE` →
`INVOICED`; không nhảy cóc, không lùi. Cho tới khi story nghiệm thu (`NCL-12-CN-003`) tự động mở mốc, đây là
cách duy nhất đưa mốc sang `READY_TO_INVOICE` để `NCL-10-CN-002` lập được hóa đơn (QTN-25).

**Trạng thái `INVOICED` không đặt được qua endpoint này** — nó chỉ do
`POST /contracts/{contractId}/milestones/{milestoneId}/invoice` (`NCL-10-CN-002`) đặt, để mốc `INVOICED` luôn đi
kèm một hóa đơn thật.

**Request:**

```json
{ "status": "READY_TO_INVOICE" }
```

**Response thành công — `200 OK`:** `data` là mốc sau khi cập nhật (cùng cấu trúc phần tử của `GET`). Ghi
`MILESTONE_STATUS_UPDATE` vào `contract_audit_logs`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi `DENIED_ACCESS`. |
| 404 | `RESOURCE_NOT_FOUND` | Không có hợp đồng `{contractId}`, không có mốc `{milestoneId}` hoặc mốc không thuộc hợp đồng. |
| 400 | `VALIDATION_ERROR` | Thiếu `status` hoặc giá trị không thuộc `PENDING`/`READY_TO_INVOICE`/`INVOICED`. |
| 400 | `INVALID_STATE` | `status` = `INVOICED` (phải lập hóa đơn qua `NCL-10-CN-002`); hoặc chuyển nhảy cóc/lùi/giữ nguyên trạng thái. |

### `NCL-04-CN-004` — Lập phụ lục điều chỉnh hợp đồng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`). Phụ lục chỉ được lập cho hợp đồng đang hiệu lực
(`status = ACTIVE`). Giá trị điều chỉnh dương là tăng, âm là giảm; backend cập nhật `totalValue` trong cùng
giao dịch và lưu snapshot trước/sau để truy vết. Nếu hợp đồng có hạn mức, giá trị sau điều chỉnh không được
vượt hạn mức. Mỗi lần lập thành công ghi `APPENDIX_CREATE` vào `contract_audit_logs`.

#### `POST /contracts/{contractId}/appendices`

**Request:**
```json
{
  "content": "Mo rong pham vi trien khai giai doan 2",
  "adjustmentValue": 200000000,
  "effectiveDate": "2026-10-01"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `content` | string | có | Nội dung thay đổi, tối đa 1000 ký tự. |
| `adjustmentValue` | number | có | Khác `0`; số dương là tăng, số âm là giảm. |
| `effectiveDate` | date | có | Nằm trong khoảng ngày hiệu lực của hợp đồng nếu hợp đồng có khai báo khoảng này. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Lap phu luc dieu chinh hop dong thanh cong",
  "data": {
    "id": 101,
    "contractId": 5,
    "content": "Mo rong pham vi trien khai giai doan 2",
    "adjustmentValue": 200000000,
    "valueBefore": 500000000,
    "valueAfter": 700000000,
    "effectiveDate": "2026-10-01",
    "createdBy": "sale01",
    "createdAt": "2026-09-07T10:15:00"
  }
}
```

#### `GET /contracts/{contractId}/appendices`

Trả về các phụ lục theo `effectiveDate` tăng dần; danh sách rỗng nếu hợp đồng chưa có phụ lục.
Mỗi phần tử có cùng cấu trúc với `data` của API tạo phụ lục.

**Response lỗi cho cả hai API:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh (`VT-04`). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng với `{contractId}`. |
| 400 | `INVALID_STATE` | Hợp đồng chưa `ACTIVE`, hoặc ngày hiệu lực nằm ngoài thời hạn hợp đồng. |
| 400 | `VALIDATION_ERROR` | Thiếu dữ liệu, nội dung quá dài, giá trị điều chỉnh bằng 0, tổng sau điều chỉnh âm hoặc vượt hạn mức. |

### `NCL-04-CN-005` — Cảnh báo khi sắp vượt hạn mức hợp đồng

Yêu cầu token của **Quản lý dự án** (`VT-02`) hoặc **Kế toán** (`VT-05`). Vì hệ thống chưa có module hóa đơn
riêng (Epic NCL-10 chưa xây), `usedValue` lấy tổng giá trị các mốc thanh toán đã chuyển trạng thái
`INVOICED` — đại diện cho phần "đã xuất hóa đơn" của hợp đồng. Ngưỡng cảnh báo cố định **80%** hạn mức.

#### `GET /contracts/{contractId}/usage`

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "contractId": 5,
    "totalValue": 500000000,
    "limitValue": 500000000,
    "usedValue": 420000000,
    "remainingValue": 80000000,
    "usedPercentage": 84,
    "nearLimit": true,
    "overLimit": false
  }
}
```

Khi hợp đồng không khai báo hạn mức (`limitValue = null`), `usedPercentage`, `nearLimit`, `overLimit` luôn
trả về trung tính (`null`/`false`) — không có gì để cảnh báo.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Quản lý dự án hoặc Kế toán. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng với `{contractId}`. |

---

### `NCL-04-CN-006` — Nhắc hợp đồng sắp hết hiệu lực

Yêu cầu token của **Kế toán** (`VT-05`). Trả về các hợp đồng đang `ACTIVE` có `endDate` nằm trong vòng
`days` ngày kể từ hôm nay (mặc định 30), sắp xếp theo ngày hết hạn gần nhất trước.

#### `GET /contracts/expiring?days=30`

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "contractId": 5,
      "contractCode": "HD-4K7X2Q9",
      "name": "Hop dong ERP",
      "customerId": 1,
      "endDate": "2026-10-05",
      "daysRemaining": 12
    }
  ]
}
```

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`). |
| 400 | `VALIDATION_ERROR` | `days` là số âm. |

---

### `NCL-04-CN-007` — Gia hạn hợp đồng

Yêu cầu token của **Nhân viên kinh doanh** (`VT-04`). Chỉ gia hạn được hợp đồng đang `ACTIVE`; hợp đồng đã
`COMPLETED`/`TERMINATED` ("đã đóng") bị từ chối và được đề nghị lập hợp đồng mới thay vì gia hạn (TC-02).
Ngày kết thúc mới phải sau ngày kết thúc hiện tại. Giá trị bổ sung (nếu có) được cộng vào `totalValue` và
vẫn phải tuân thủ hạn mức tràn (QTN-19) như phụ lục điều chỉnh.

#### `POST /contracts/{contractId}/renewals`

**Request:**
```json
{
  "newEndDate": "2027-06-30",
  "additionalValue": 100000000,
  "notes": "Khach hang dong y tiep tuc them 6 thang"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `newEndDate` | date | có | Phải sau `endDate` hiện tại của hợp đồng. |
| `additionalValue` | number | không | `null`/`0` = giữ nguyên giá trị hợp đồng. |
| `notes` | string | không | Ghi chú lý do gia hạn. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Gia han hop dong thanh cong",
  "data": {
    "id": 12,
    "contractId": 5,
    "previousEndDate": "2026-12-31",
    "newEndDate": "2027-06-30",
    "additionalValue": 100000000,
    "valueBefore": 500000000,
    "valueAfter": 600000000,
    "notes": "Khach hang dong y tiep tuc them 6 thang",
    "createdBy": "sale01",
    "createdAt": "2026-09-08T10:00:00"
  }
}
```

#### `GET /contracts/{contractId}/renewals`

Trả về lịch sử gia hạn của hợp đồng, mới nhất trước; danh sách rỗng nếu chưa từng gia hạn. Mỗi phần tử có
cùng cấu trúc với `data` của API gia hạn.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Nhân viên kinh doanh (`VT-04`). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hợp đồng với `{contractId}`. |
| 400 | `INVALID_STATE` | Hợp đồng không ở trạng thái `ACTIVE`. |
| 400 | `VALIDATION_ERROR` | Thiếu `newEndDate`, `newEndDate` không sau ngày kết thúc hiện tại, hoặc giá trị sau gia hạn vượt hạn mức. |

## Epic `NCL-05` — Dự án và công việc

### `NCL-05-CN-002` — Chia hạng mục và công việc của dự án

Các endpoint yêu cầu token của Quản lý dự án (`VT-02`) khi tạo dữ liệu. Endpoint đọc cây cho phép
Quản lý dự án, nhân viên chuyên môn (`VT-03`) và Ban giám đốc (`VT-01`). Mỗi hạng mục và công việc đều
thuộc đúng một dự án; `parentId`/`parentTaskId` chỉ được trỏ tới phần tử cùng dự án (và cùng hạng mục với task).

#### `POST /projects/{projectId}/work-packages`

```json
{
  "parentId": null,
  "name": "Phân tích nghiệp vụ",
  "description": "Làm rõ yêu cầu",
  "sortOrder": 1
}
```

`parentId` bỏ trống để tạo hạng mục gốc. Response `200 OK` trả về một node `WorkBreakdownRes` với `tasks`
và `children` rỗng.

#### `POST /projects/{projectId}/work-packages/{workPackageId}/tasks`

```json
{
  "parentTaskId": null,
  "name": "Phỏng vấn người dùng",
  "description": "Ghi nhận quy trình hiện tại",
  "expectedStartDate": "2026-09-10",
  "expectedEndDate": "2026-09-12"
}
```

`parentTaskId` bỏ trống để tạo task cấp đầu tiên trong hạng mục; task con phải thuộc cùng hạng mục.
Task mới có trạng thái `TODO`.

#### `GET /projects/{projectId}/work-breakdown`

Response `200 OK`:

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 10,
      "parentId": null,
      "name": "Phân tích nghiệp vụ",
      "description": "Làm rõ yêu cầu",
      "tasks": [
        {
          "id": 20,
          "projectId": 1,
          "workPackageId": 10,
          "parentTaskId": null,
          "name": "Phỏng vấn người dùng",
          "description": "Ghi nhận quy trình hiện tại",
          "expectedStartDate": "2026-09-10",
          "expectedEndDate": "2026-09-12",
          "status": "TODO"
        }
      ],
      "children": []
    }
  ]
}
```

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Tên hạng mục/công việc để trống. |
| 400 | `INVALID_STATE` | Ngày kết thúc dự kiến sớm hơn ngày bắt đầu hoặc dự án đã đóng. |
| 403 | `FORBIDDEN` | Người gọi không có vai trò được phép. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án, hạng mục cha hoặc công việc cha trong cùng dự án. |

### `NCL-05-CN-003` — Giao việc cho nhân sự

Các endpoint thay đổi assignment yêu cầu token của Quản lý dự án (`VT-02`). Nhân sự được giao phải có hồ sơ
nhân sự, tài khoản đang hoạt động và chưa có ngày kết thúc hợp đồng lao động. Một request có thể giao cùng một
công việc cho nhiều người; gọi lại endpoint sẽ thay thế toàn bộ danh sách người được giao hiện tại.

#### `PUT /projects/{projectId}/tasks/{taskId}/assignments`

```json
{
  "userIds": [101, 102],
  "expectedStartDate": "2026-09-10",
  "expectedEndDate": "2026-09-12"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `userIds` | number[] | có | Ít nhất một user ID, không được trùng. |
| `expectedStartDate` | date | không | Ngày bắt đầu mong muốn. |
| `expectedEndDate` | date | không | Không được sớm hơn `expectedStartDate`. |

Response `200 OK` trả về danh sách assignment:

```json
{
  "success": true,
  "message": "Giao viec cho nhan su thanh cong",
  "data": [
    {
      "id": 201,
      "taskId": 20,
      "userId": 101,
      "username": "dev01",
      "fullName": "Dev One",
      "expectedStartDate": "2026-09-10",
      "expectedEndDate": "2026-09-12"
    }
  ]
}
```

#### `GET /projects/{projectId}/tasks/{taskId}/assignments`

Cho phép Quản lý dự án (`VT-02`), Nhân viên chuyên môn (`VT-03`) và Ban giám đốc (`VT-01`) xem danh sách người
được giao của công việc.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `userIds` rỗng. |
| 400 | `DUPLICATE_DATA` | `userIds` chứa ID trùng nhau. |
| 400 | `INVALID_STATE` | Dự án đã đóng, nhân sự đã kết thúc hợp đồng, tài khoản không hoạt động hoặc ngày không hợp lệ. |
| 403 | `FORBIDDEN` | Người gọi không có vai trò được phép. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án, công việc hoặc hồ sơ nhân sự tương ứng. |

### `NCL-05-CN-004` — Cập nhật tiến độ công việc

Yêu cầu token của **Nhân viên chuyên môn** (`VT-03`). Chỉ người **đang được giao** công việc đó (có bản ghi
trong `project_task_assignments`) mới đổi được trạng thái — không phụ thuộc vào việc ai là người giao việc.
Chấp nhận đổi tự do giữa bốn trạng thái `TODO` · `IN_PROGRESS` · `WAITING_APPROVAL` · `DONE` (câu chuyện này
không áp thứ tự bắt buộc như luồng giai đoạn cơ hội). Đổi trạng thái thành công phản ánh ngay trên
`GET /projects/{projectId}/work-breakdown` (`NCL-05-CN-002`, TC-01) và ghi một dòng `TASK_PROGRESS_UPDATED`
vào `project_audit_logs` — người thực hiện, nội dung (trạng thái cũ → mới), thời điểm (TC-03).

#### `PATCH /projects/{projectId}/tasks/{taskId}/progress`

```json
{ "status": "DONE" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `status` | string | có | Một trong `TODO` · `IN_PROGRESS` · `WAITING_APPROVAL` · `DONE`. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Cap nhat tien do cong viec thanh cong",
  "data": {
    "id": 20,
    "projectId": 1,
    "workPackageId": 10,
    "parentTaskId": null,
    "name": "Phỏng vấn người dùng",
    "description": "Ghi nhận quy trình hiện tại",
    "expectedStartDate": "2026-09-10",
    "expectedEndDate": "2026-09-12",
    "status": "DONE"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu hoặc sai giá trị `status`. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-03`, **hoặc** là `VT-03` nhưng không nằm trong danh sách người được giao công việc này (TC-02) — cả hai trường hợp hệ thống đều ghi nhật ký lần từ chối. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án hoặc công việc thuộc dự án đó. |
| 400 | `INVALID_STATE` | Dự án đã đóng (`CLOSED` — xem `NCL-05-CN-006`). |

**Lưu ý cho Frontend:**
- Đây **không phải** lỗi phân quyền theo vai trò thông thường: một nhân viên chuyên môn hợp lệ vẫn nhận
  `403 FORBIDDEN` nếu mở nhầm công việc của người khác — hiển thị thông báo "Bạn không phải người phụ trách
  công việc này" thay vì thông báo "không đủ quyền" chung chung.
- Sau khi đổi trạng thái thành công, làm mới lại cây `GET /projects/{projectId}/work-breakdown` (hoặc cập nhật
  optimistic ngay trên bảng đang hiển thị) để phản ánh đúng bảng theo dõi dự án.
- Không cần gọi thêm API nào để ghi lịch sử — mỗi lần đổi trạng thái backend tự ghi vào nhật ký dự án.

---

### `NCL-05-CN-005` — Đặt ngân sách giờ công cho công việc

Yêu cầu token của **Quản lý dự án** (`VT-02`). Gọi lại nhiều lần sẽ **ghi đè** ngân sách hiện tại (không cộng dồn).
Ngoài `budgetHours` do người dùng nhập, mỗi công việc có `approvedHours` (giờ công đã duyệt — giờ công nhân
viên ghi qua `NCL-06-CN-001` ở trạng thái `DRAFT` chưa tính vào đây; hiện vẫn là `0` cho tới khi bảng chấm
công được duyệt bởi các câu chuyện sau của Epic `NCL-06`).
`usageRatio = approvedHours / budgetHours`; **`overBudgetWarning = true` khi `usageRatio >= 0.80`** (QTN-20).
Mỗi lần đặt/đổi ngân sách ghi một dòng `TASK_BUDGET_UPDATED` vào `project_audit_logs` — người thực hiện, nội dung
(ngân sách cũ → mới), thời điểm (TC-04).

#### `PUT /projects/{projectId}/tasks/{taskId}/budget`

```json
{ "budgetHours": 40 }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `budgetHours` | number | có | Số giờ ngân sách, phải lớn hơn `0`. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Dat ngan sach gio cong thanh cong",
  "data": {
    "taskId": 20,
    "projectId": 1,
    "budgetHours": 40,
    "approvedHours": 0,
    "usageRatio": 0,
    "overBudgetWarning": false
  }
}
```

Ví dụ khi công việc đã có `34` giờ được duyệt trên ngân sách `40` giờ (TC-02):

```json
{
  "success": true,
  "message": "Dat ngan sach gio cong thanh cong",
  "data": {
    "taskId": 20,
    "projectId": 1,
    "budgetHours": 40,
    "approvedHours": 34,
    "usageRatio": 0.85,
    "overBudgetWarning": true
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `budgetHours` hoặc `budgetHours <= 0`. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-02` — hệ thống ghi nhật ký lần từ chối (TC-03). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án hoặc công việc thuộc dự án đó. |
| 400 | `INVALID_STATE` | Dự án đã đóng (`CLOSED` — xem `NCL-05-CN-006`). |

**Lưu ý cho Frontend:**
- `usageRatio` là phân số `0.0`–`1.0+` (không phải phần trăm) — nhân `100` khi hiển thị (`85%`).
- Khi `overBudgetWarning = true`, hiển thị cảnh báo nổi bật (ví dụ tô đỏ thanh tiến độ giờ công) ngay trên màn
  hình chi tiết công việc — không cần đợi người dùng tải lại trang, vì cờ này luôn được trả trong response.
- Giờ công do nhân viên ghi qua `NCL-06-CN-001` ở trạng thái `DRAFT` và **chưa** tính vào `approvedHours` —
  cột này chỉ tăng khi bảng chấm công được duyệt (các câu chuyện sau của Epic `NCL-06`); Frontend vẫn nên
  dựng sẵn UI hiển thị tỷ lệ ngay từ bây giờ vì hợp đồng response không đổi khi `approvedHours` bắt đầu có dữ liệu.

---

### `NCL-05-CN-006` — Đóng dự án

Yêu cầu token của **Quản lý dự án** (`VT-02`). Chỉ đóng được dự án đang `RUNNING` (gọi lại trên dự án đã
`CLOSED` nhận `400 INVALID_STATE`, tránh đóng hai lần). Hệ thống chặn đóng nếu dự án còn công việc ở trạng thái
`WAITING_APPROVAL` (`NCL-05-CN-004`) — đại diện cho phần việc/bảng chấm công còn treo chưa được duyệt (QTN-13);
Epic `NCL-06` mới triển khai phần ghi giờ công (`NCL-06-CN-001`, bản ghi `DRAFT` chưa tạo trạng thái treo)
nên hiện tại đây vẫn là nguồn dữ liệu "còn treo" duy nhất đã có.
Đóng thành công ghi một dòng `PROJECT_CLOSED` vào `project_audit_logs` — người thực hiện, nội dung, thời điểm (TC-04).

#### `POST /projects/{projectId}/close`

Không cần body.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Dong du an thanh cong",
  "data": {
    "id": 20,
    "projectCode": "DA-4K7X2Q9",
    "name": "Trien khai ERP Cong ty TNHH ABC",
    "contractId": 5,
    "customerId": 1,
    "projectType": "FIXED_PRICE",
    "limitValue": 600000000,
    "startDate": "2027-01-01",
    "expectedEndDate": "2027-12-31",
    "projectManagerId": 7,
    "status": "CLOSED",
    "createdBy": "pm01",
    "createdAt": "2026-09-09T10:00:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-02` — hệ thống ghi nhật ký lần từ chối (TC-03). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án với `{projectId}`. |
| 400 | `INVALID_STATE` | Dự án không ở trạng thái `RUNNING` (đã đóng); **hoặc** còn công việc `WAITING_APPROVAL` — `message` liệt kê đầy đủ các công việc còn treo dạng `#20 Ten cong viec, #21 Ten cong viec khac` (TC-02). |

**Lưu ý cho Frontend:**
- Khi nhận `400 INVALID_STATE` kèm danh sách công việc còn treo, hiển thị nguyên `message` cho người dùng (hoặc
  parse theo dấu phẩy nếu muốn liệt kê từng dòng) và đề nghị duyệt/hoàn tất các công việc đó trước khi đóng lại.
- Sau khi đóng thành công, khoá toàn bộ nút chỉnh sửa cây công việc, giao việc, cập nhật tiến độ và ngân sách
  giờ trên giao diện dự án đó — các API tương ứng (`NCL-05-CN-002`/`003`/`004`/`005`) đã tự chặn ghi
  (`400 INVALID_STATE`) ở tầng backend khi dự án `CLOSED`, Frontend chỉ cần ẩn/vô hiệu hoá nút bấm để tránh gọi
  API rồi mới nhận lỗi.

### `NCL-05-CN-008` — Quản lý mốc tiến độ của dự án

Yêu cầu token của **Quản lý dự án** (`VT-02`) trên toàn bộ endpoint. Vai trò khác nhận
`403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03). Điều kiện bắt đầu: dự án phải đang
chạy (`RUNNING`) và **đã có cây công việc** — nếu chưa có hạng mục nào, tạo mốc bị từ chối
`400 INVALID_STATE`.

Mỗi mốc gồm tên, ngày kế hoạch (`plannedDate`) và các **hạng mục phải hoàn thành** (danh sách
id công việc trong cây công việc của dự án). Hệ thống **tự rà soát** khi trả danh sách mốc:
so ngày hiện tại với ngày kế hoạch, không cần job nền.

Trạng thái mốc (`status`) tính động:
- `DONE` — đã ghi nhận ngày thực tế (`actualDate`).
- `LATE` — đã qua ngày kế hoạch mà chưa hoàn thành; kèm `daysLate` = số ngày trễ (TC-02).
- `ON_TRACK` — còn lại.

#### `POST /projects/{projectId}/milestones` (TC-01)

```json
{
  "name": "Bàn giao giai đoạn một",
  "description": "Chữ ký nghiệm thu giai đoạn 1",
  "plannedDate": "2026-10-01",
  "taskIds": [11, 12]
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | có | Tên mốc. |
| `description` | string | không | Mô tả thêm. |
| `plannedDate` | date | có | Ngày kế hoạch hoàn thành. |
| `taskIds` | number[] | có | Ít nhất 1 id công việc thuộc cây công việc của dự án. |

Response `200 OK` trả về `ProjectMilestoneRes`:

```json
{
  "success": true,
  "message": "Tao moc tien do thanh cong",
  "data": {
    "id": 21,
    "projectId": 1,
    "name": "Bàn giao giai đoạn một",
    "description": null,
    "plannedDate": "2026-10-01",
    "actualDate": null,
    "status": "ON_TRACK",
    "daysLate": null,
    "items": [{ "taskId": 11, "taskName": "Thiết lập môi trường", "taskStatus": "TODO" }]
  }
}
```

#### `GET /projects/{projectId}/milestones` (TC-02)

Bảng theo dõi tiến độ: trả danh sách mốc sắp theo `plannedDate`, trạng thái và `daysLate`
do hệ thống tính tại thời điểm gọi.

#### `PUT /projects/{projectId}/milestones/{milestoneId}`

Cập nhật tên, mô tả, ngày kế hoạch và thay toàn bộ danh sách `taskIds` — body giống `POST`.

#### `POST /projects/{projectId}/milestones/{milestoneId}/complete`

Ghi nhận ngày thực tế hoàn thành mốc: `{"actualDate": "2026-09-28"}`. Sau đó mốc có
`status = DONE`. Ngày thực tế không được ở tương lai.

#### `DELETE /projects/{projectId}/milestones/{milestoneId}`

Xoá mốc và các hạng mục liên quan (không xoá công việc trong cây công việc).

Mọi thao tác tạo/cập nhật/hoàn thành/xoá đều được ghi vào nhật ký dự án (TC-04) với
action `MILESTONE_CREATED` / `MILESTONE_UPDATED` / `MILESTONE_DELETED`.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu tên mốc, ngày kế hoạch hoặc `taskIds` rỗng. |
| 400 | `INVALID_STATE` | Dự án chưa có cây công việc, dự án đã đóng, hoặc ngày thực tế ở tương lai. |
| 403 | `FORBIDDEN` | Người dùng không phải Quản lý dự án (`VT-02`). |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy dự án/mốc, hoặc công việc không thuộc dự án. |

### `NCL-05-CN-009` — Quản lý rủi ro của dự án

Yêu cầu token của **Quản lý dự án** (`VT-02`) trên toàn bộ endpoint. Vai trò khác nhận
`403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03). Mọi thao tác ghi chỉ thực hiện được
khi dự án đang chạy (`RUNNING`) — dự án đã đóng nhận `400 INVALID_STATE`.

Mỗi rủi ro gồm: mô tả (`description`), **mức tác động** (`impact`) và **khả năng xảy ra**
(`likelihood`) — cùng thang `LOW` / `MEDIUM` / `HIGH`; biện pháp giảm thiểu (`mitigation`,
tuỳ chọn) và **người theo dõi** (`watcherId` — tài khoản đang hoạt động).

Hệ thống **tự tính** khi trả dữ liệu (không lưu DB, không job nền):
- `score` = trọng số `impact` × trọng số `likelihood` (mỗi mức 1/2/3 → điểm `1..9`).
- `severity`: `score ≥ 6` → `HIGH`; `score ≥ 3` → `MEDIUM`; còn lại → `LOW`.

`status` (lưu DB, mặc định `OPEN` khi tạo): `OPEN` → `MITIGATING` → `CLOSED`.

#### `POST /projects/{projectId}/risks` (TC-01)

```json
{
  "description": "Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp",
  "impact": "HIGH",
  "likelihood": "MEDIUM",
  "mitigation": "Chuẩn bị nhà thầu dự phòng, chốt mốc kiểm tra hằng tuần",
  "watcherId": 7
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `description` | string | có | Mô tả rủi ro. |
| `impact` | enum | có | `LOW` / `MEDIUM` / `HIGH`. |
| `likelihood` | enum | có | `LOW` / `MEDIUM` / `HIGH`. |
| `mitigation` | string | không | Biện pháp giảm thiểu. |
| `watcherId` | number | có | `id` tài khoản người theo dõi (đang hoạt động). |

Response `200 OK` trả về `ProjectRiskRes`:

```json
{
  "success": true,
  "message": "Ghi nhan rui ro thanh cong",
  "data": {
    "id": 31,
    "projectId": 1,
    "description": "Nhà thầu phụ có nguy cơ chậm tiến độ tích hợp",
    "impact": "HIGH",
    "likelihood": "MEDIUM",
    "score": 6,
    "severity": "HIGH",
    "status": "OPEN",
    "mitigation": "Chuẩn bị nhà thầu dự phòng, chốt mốc kiểm tra hằng tuần",
    "watcherId": 7,
    "watcherName": "Nguyễn Văn A",
    "createdBy": "pm01",
    "createdAt": "2026-09-10T10:00:00",
    "updatedAt": "2026-09-10T10:00:00"
  }
}
```

#### `GET /projects/{projectId}/risks` (TC-02)

Bảng theo dõi rủi ro: trả danh sách **sắp theo `score` giảm dần** (cùng điểm thì theo `id`),
kèm `score` và `severity` do hệ thống tính tại thời điểm gọi.

#### `PUT /projects/{projectId}/risks/{riskId}`

Cập nhật `description`, `impact`, `likelihood`, `mitigation`, `watcherId` — body giống `POST`.

#### `PUT /projects/{projectId}/risks/{riskId}/status`

Cập nhật trạng thái xử lý: `{"status": "MITIGATING"}` (hoặc `OPEN` / `CLOSED`).

#### `DELETE /projects/{projectId}/risks/{riskId}`

Xoá rủi ro khỏi dự án.

Mọi thao tác tạo/cập nhật/đổi trạng thái/xoá đều được ghi vào nhật ký dự án (TC-04) với
action `RISK_CREATED` / `RISK_UPDATED` / `RISK_DELETED`.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `description`, `impact`, `likelihood` hoặc `watcherId`; enum sai giá trị. |
| 400 | `INVALID_STATE` | Dự án đã đóng, hoặc người theo dõi không còn hoạt động. |
| 403 | `FORBIDDEN` | Người dùng không phải Quản lý dự án (`VT-02`). |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy dự án/rủi ro, hoặc người theo dõi không tồn tại. |


## Epic `NCL-06` — Bảng chấm công

### `NCL-06-CN-001` — Ghi giờ công theo công việc

Yêu cầu token của **Nhân viên chuyên môn** (`VT-03`). Mỗi bản ghi giờ công là số giờ một nhân sự làm trên
một công việc trong một ngày (bảng `timesheet_entries`); bản ghi mới luôn ở trạng thái `DRAFT`. Giờ công
chỉ cộng vào `approvedHours` của công việc sau khi được duyệt ở luồng nộp/duyệt bảng chấm công tuần
(các câu chuyện sau của Epic `NCL-06`).

Quy tắc nghiệp vụ (backend tự kiểm, Frontend không phải lặp lại):

- **Chỉ người đang được giao** công việc mới ghi được giờ (TC-02, giống `NCL-05-CN-004`) — `VT-03` hợp lệ
  nhưng mở nhầm công việc của người khác vẫn nhận `403 FORBIDDEN` với thông báo "Bạn không phải người
  được giao công việc này".
- Dự án phải đang `RUNNING` — dự án đã đóng nhận `400 INVALID_STATE` (thay thế nguồn dữ liệu "còn treo"
  mà `NCL-05-CN-006` từng dẫn chiếu, tương ứng câu chuyện chặn ghi giờ vào dự án đã đóng `VHDV-76`).
- Ngày làm việc (`workDate`) không được ở tương lai; tổng giờ công của một nhân sự trong một ngày trên
  mọi công việc không vượt `12` giờ (QTN-14 — giới hạn giờ công trong ngày).
- Mỗi cặp **(công việc, ngày)** chỉ có **một** bản ghi của một nhân sự — ghi trùng nhận `409 DUPLICATE_DATA`
  kèm gợi ý sửa bản ghi có sẵn bằng `PUT`.
- Bản ghi chỉ sửa/xoá được khi còn `DRAFT`; sau khi nộp/duyệt phải đi qua luồng điều chỉnh bằng bút toán
  đảo (câu chuyện `VHDV-80`).
- Mỗi lần ghi/sửa/xoá ghi một dòng `TIME_ENTRY_UPDATED` vào `project_audit_logs` — người thực hiện, nội dung
  (số giờ, ngày, thao tác), thời điểm (TC-04).

#### `GET /me/time-entry-tasks`

Trả danh sách công việc mà nhân viên chuyên môn hiện tại được giao và thuộc các dự án đang `RUNNING`.
Endpoint này là nguồn dữ liệu cho danh sách chọn dự án/công việc khi ghi giờ; dự án `CLOSED` không xuất hiện.
Việc lọc chỉ có tác dụng hỗ trợ giao diện, vì các API tạo/sửa/xoá bên dưới vẫn kiểm tra lại trạng thái dự án
tại thời điểm thực hiện để xử lý trường hợp dự án vừa bị đóng.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "projectId": 1,
      "projectName": "Du an dang chay",
      "taskId": 20,
      "taskName": "Phan tich quy trinh",
      "taskStatus": "IN_PROGRESS"
    }
  ]
}
```

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Người gọi không phải Nhân viên chuyên môn (`VT-03`). |

#### `POST /projects/{projectId}/tasks/{taskId}/time-entries`

```json
{
  "workDate": "2026-09-10",
  "hours": 3.5,
  "note": "Phân tích quy trình hiện tại",
  "billable": true
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `workDate` | date | có | Ngày làm việc, không được ở tương lai. |
| `hours` | number | có | Lớn hơn 0 (giới hạn kiểm tra `@DecimalMin("0.01")`). |
| `note` | string | có | Tối đa 1000 ký tự, không được để trống. |
| `billable` | boolean | không | Có tính phí hay không — mặc định `true`. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Ghi gio cong thanh cong",
  "data": {
    "id": 30,
    "taskId": 20,
    "userId": 7,
    "workDate": "2026-09-10",
    "hours": 3.5,
    "status": "DRAFT",
    "note": "Phân tích quy trình hiện tại",
    "billable": true,
    "createdAt": "2026-09-10T15:20:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `workDate`/`hours`/`note`, `hours <= 0`, `note` rỗng/vượt 1000 ký tự. |
| 400 | `INVALID_STATE` | Dự án đã đóng (`CLOSED`), ngày làm việc ở tương lai, hoặc tổng giờ trong ngày vượt 12 (QTN-14). |
| 409 | `DUPLICATE_DATA` | Đã có bản ghi giờ công của chính mình trên công việc này trong cùng ngày. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-03` — hệ thống ghi nhật ký lần từ chối (TC-03); **hoặc** là `VT-03` nhưng không nằm trong danh sách người được giao công việc này (TC-02). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án, hoặc công việc không thuộc dự án đó. |

#### `PUT /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}`

```json
{ "hours": 4, "note": "Đã chỉnh sửa sau khi soát lại", "billable": true }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `hours` | number | có | Lớn hơn 0 — ghi đè số giờ cũ. |
| `note` | string | không | Ghi đè ghi chú cũ. |
| `billable` | boolean | không | Có tính phí hay không — không truyền thì giữ nguyên giá trị cũ. |

Chỉ sửa được bản ghi **DRAFT của chính mình trên đúng công việc** trong path; `workDate` và công việc không
đổi — muốn đổi ngày thì xoá bản ghi cũ rồi ghi bản ghi mới. Kèm kiểm tra lại trần 12 giờ/ngày (QTN-14) sau khi thay
đổi số giờ.

**Response lỗi:** giống `POST`, thêm:

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 404 | `RESOURCE_NOT_FOUND` | Bản ghi không tồn tại, hoặc không phải bản ghi của chính mình trên công việc này. |
| 400 | `INVALID_STATE` | Bản ghi đã `SUBMITTED`/`APPROVED`/`REJECTED` — không sửa trực tiếp được. |

#### `DELETE /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}`

Xoá bản ghi giờ công **DRAFT của chính mình**. Không cần body. Thành công trả
`{ "success": true, "message": "Xoa ban ghi gio cong thanh cong", "data": null }`.
Response lỗi giống `PUT` (`404` khi không phải bản ghi của mình, `400 INVALID_STATE` khi bản ghi không còn DRAFT).

### `NCL-06-CN-008` — Ghi giờ công bằng đồng hồ bấm giờ

Các endpoint dưới đây yêu cầu token của **Nhân viên chuyên môn** (`VT-03`). Mỗi nhân sự chỉ có một phiên
đồng hồ đang chạy. Phiên được lưu riêng trong `timesheet_timers`; khi dừng, hệ thống tính số giờ từ
`startedAt` đến thời điểm dừng, làm tròn 2 chữ số thập phân (tối thiểu `0.01` giờ), rồi tạo một bản ghi
`timesheet_entries` trạng thái `DRAFT`. Các quy tắc dự án đang chạy, kỳ chấm công mở, người được giao và
giới hạn 12 giờ/ngày vẫn được kiểm tra như API ghi giờ thủ công.

#### `POST /projects/{projectId}/tasks/{taskId}/time-entry-timer`

```json
{ "note": "Phân tích quy trình hiện tại", "billable": true }
```

`note` bắt buộc, tối đa 1000 ký tự; `billable` không bắt buộc và mặc định là `true`.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Bat dong ho bam gio thanh cong",
  "data": {
    "timerId": 40,
    "projectId": 1,
    "taskId": 20,
    "userId": 7,
    "startedAt": "2026-09-10T15:20:00",
    "elapsedHours": 0.00,
    "note": "Phân tích quy trình hiện tại",
    "billable": true
  }
}
```

#### `GET /me/time-entry-timer`

Trả phiên đang chạy theo cùng cấu trúc `data` của endpoint start; `data: null` nếu không có phiên.

#### `POST /me/time-entry-timer/stop`

Không cần body. Thành công trả về `TimeEntryRes` của bản ghi DRAFT vừa tạo, theo cùng cấu trúc response
của `POST /projects/{projectId}/tasks/{taskId}/time-entries`.

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `note` hoặc `note` vượt 1000 ký tự khi bắt đầu. |
| 400 | `INVALID_STATE` | Dự án đã đóng, kỳ đã khóa, vượt 12 giờ/ngày, đã có timer đang chạy, hoặc dừng khi không có timer. |
| 409 | `DUPLICATE_DATA` | Khi dừng, ngày/công việc đã có bản ghi giờ công gốc của chính mình. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Người gọi không phải `VT-03`, hoặc không được giao công việc. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án/công việc của timer. |

#### `GET /me/time-entries?weekFrom=2026-09-07&weekTo=2026-09-13`

Trả lưới giờ công **của chính mình** trong khoảng ngày (một tuần chấm công), nhóm theo công việc — mỗi
phần tử là một `TimesheetSummaryRes`:

```json
{
  "success": true,
  "data": [
    {
      "taskId": 20,
      "taskName": "Phỏng vấn người dùng",
      "weekFrom": "2026-09-07",
      "weekTo": "2026-09-13",
      "entries": [
        { "id": 30, "taskId": 20, "userId": 7, "workDate": "2026-09-09", "hours": 5,
          "status": "DRAFT", "note": null, "billable": true, "createdAt": "2026-09-09T17:00:00" }
      ],
      "totalHours": 8,
      "budgetHours": 8,
      "approvedHours": 0,
      "usageRatio": 1.0000,
      "overBudgetWarning": true
    }
  ]
}
```

- `totalHours` — tổng giờ của công việc trong khoảng ngày.
- `usageRatio` là phân số `0.0`–`1.0+` (nhân `100` khi hiển thị); `overBudgetWarning = true` khi
  `usageRatio >= 0.80` (QTN-20); cả hai là `null`/`false` khi công việc chưa đặt ngân sách.
- `400 VALIDATION_ERROR` khi `weekTo` sớm hơn `weekFrom`, khi thiếu `weekFrom`/`weekTo`, hoặc khi giá trị
  không đúng định dạng ngày `yyyy-MM-dd`.

**Lưu ý cho Frontend:**

- `status` của bản ghi dùng enum `TimeEntryStatus`: `DRAFT` (đang ghi, sửa/xoá được) · `SUBMITTED` (đã nộp
  trong bảng tuần) · `APPROVED` (đã duyệt) · `REJECTED` (bị từ chối). Ở story này mọi bản ghi mới là `DRAFT`.
- Ghi trùng ngày nhận `409 DUPLICATE_DATA` — hiển thị thông báo "Đã có bản ghi giờ công cho công việc này
  trong ngày …" và chuyển người dùng sang chế độ sửa bản ghi có sẵn thay vì tạo mới.
- `approvedHours` trong lưới tuần hiện vẫn `0` vì luồng duyệt chưa triển khai; giữ sẵn UI hiển thị tỷ lệ
  `usageRatio` vì hợp đồng không đổi khi dữ liệu duyệt bắt đầu có.
- Các endpoint `POST/PUT/DELETE` trả `400 INVALID_STATE` khi dự án đã đóng — sau khi `NCL-05-CN-006` đóng dự
  án, ẩn/vô hiệu hoá form ghi giờ công để tránh gọi rồi mới nhận lỗi.

### `NCL-06-CN-002` — Nộp bảng chấm công theo tuần

Yêu cầu token của **Nhân viên chuyên môn** (`VT-03`), chỉ nộp bảng chấm công **của chính mình**. Khi nộp,
hệ thống chuyển toàn bộ dòng giờ công `DRAFT` trong tuần sang `SUBMITTED` và tạo/cập nhật bảng tuần
(bảng `timesheets`) ở trạng thái `PENDING_APPROVAL` cho PM duyệt — kể từ đó người dùng không sửa được
các dòng giờ công của tuần (TC-03).

Quy tắc nghiệp vụ (backend tự kiểm, Frontend không phải lặp lại):

- **Điều kiện bắt đầu**: tuần phải có **ít nhất một dòng `DRAFT`** — tuần trống hoặc toàn dòng đã nộp
  nhận `400 INVALID_STATE`.
- **QTN-14 — giới hạn 12 giờ/ngày**: nếu tồn tại ngày có tổng giờ công vượt `12`, nộp bị chặn
  `400 INVALID_STATE` kèm `message` **liệt kê từng ngày vi phạm và tổng giờ** dạng
  `... tai ngay: 2026-09-10 (14 gio), 2026-09-11 (13.5 gio)` (TC-02) — không dòng nào bị chuyển trạng thái.
- **Không nộp lại** khi bảng tuần đang `PENDING_APPROVAL` hoặc đã `APPROVED` (TC-03); bảng bị
  `REJECTED` cho phép nộp lại — hệ thống cập nhật lại đúng bản ghi bảng tuần cũ (unique người dùng + tuần).
- **Lưu lịch sử (TC-05)**: mỗi lần nộp ghi một dòng nhật ký hệ thống `Nop bang cham cong tuan` — người
  thực hiện (tự điền từ phiên đăng nhập), nội dung (tuần, tổng giờ, số dòng chuyển duyệt), thời điểm.
- **Thông báo người duyệt (TC-01)**: sau khi nộp thành công, hệ thống gửi **thông báo in-app** cho
  **từng Quản lý dự án** của các dự án có dòng giờ công trong tuần (`NotificationType.TIMESHEET_SUBMITTED`,
  nội dung gồm tuần nộp, tổng giờ, số dòng chuyển duyệt). PM vẫn nhìn thấy bảng qua hàng đợi chờ duyệt
  (`GET /timesheets/pending`, bảng ở trạng thái `PENDING_APPROVAL`).

#### `POST /me/timesheets/{weekStartDate}/submit`

Không cần body (gửi `{}` nếu client yêu cầu). `{weekStartDate}` là **ngày đầu tuần** — hệ thống tự lấy
khoảng 7 ngày liên kếp (`weekStartDate` → `weekStartDate + 6`), trùng khớp với `weekFrom`/`weekTo` trên
lưới `GET /me/time-entries`.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Nop bang cham cong tuan thanh cong",
  "data": {
    "id": 50,
    "userId": 7,
    "weekStartDate": "2026-09-07",
    "weekEndDate": "2026-09-13",
    "status": "PENDING_APPROVAL",
    "totalHours": 8,
    "submittedBy": "nv01",
    "submittedAt": "2026-09-13T10:00:00"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Khoảng tuần không hợp lệ (qua endpoint này tuần luôn 7 ngày nên hiếm gặp). |
| 400 | `INVALID_STATE` | Tuần chưa có dòng `DRAFT` nào; tồn tại ngày vượt 12 giờ (QTN-14, `message` liệt kê ngày); hoặc bảng tuần đã nộp (`PENDING_APPROVAL`/`APPROVED`). |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-03` — hệ thống ghi nhật ký lần từ chối (TC-04); gọi được thì luôn nộp bảng của chính mình. |

**Lưu ý cho Frontend:**

- Chỉ bật nút "Nộp bảng" khi lưới tuần có ít nhất một dòng `DRAFT` (trạng thái khác ẩn nút để tránh gọi
  rồi mới nhận `400`).
- Nhận `400 INVALID_STATE` kèm danh sách ngày vượt ngưỡng → hiển thị nguyên `message` cho người dùng
  (dạng "Vượt 12 giờ/ngày tại ngày: …") và **không** làm thay đổi lưới — hệ thống không chuyển dòng nào.
- Sau khi nộp thành công (`data.status = "PENDING_APPROVAL"`): chuyển toàn bộ dòng của tuần sang chế độ
  chỉ đọc — mọi lời gọi `PUT/DELETE time-entries` với dòng đã `SUBMITTED` sẽ nhận `400 INVALID_STATE`.
- Dùng `weekStartDate` của lưới tuần đang hiển thị làm `{weekStartDate}` trên path — khớp tự nhiên với
  dữ liệu `GET /me/time-entries`.

### `NCL-06-CN-002` — Notification API (Thông báo in-app)

Khi nhân viên nộp bảng chấm công (CN-002), hệ thống gửi **thông báo in-app** cho từng PM của các dự án có dòng giờ công trong tuần (`NotificationType.TIMESHEET_SUBMITTED`). PM có thể lấy danh sách thông báo qua:

#### `GET /notifications?unreadOnly=false&page=0&size=20`

Trả về danh sách thông báo của người dùng hiện tại, phân trang.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "recipientId": 2,
      "type": "TIMESHEET_SUBMITTED",
      "title": "Bang cham cong moi can duyet",
      "content": "Nhan su #7 da nop bang cham cong tuan 2026-09-07 - 2026-09-13 (8 gio, 2 dong)",
      "channel": "IN_APP",
      "referenceId": null,
      "referenceType": "Timesheet",
      "isRead": false,
      "readAt": null,
      "sentAt": "2026-09-13T10:05:00"
    }
  ]
}
```

#### `GET /notifications/unread-count`

Trả về số lượng thông báo chưa đọc.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": 3
}
```

#### `POST /notifications/read`

Đánh dấu thông báo đã đọc.

```json
{ "notificationIds": [100, 101] }
```

**Response thành công — `200 OK`:**

```json
{ "success": true, "message": "Da danh dau da doc" }
```

---

### `NCL-06-CN-003` — Duyệt bảng chấm công

Yêu cầu token của **Quản lý dự án** (`VT-02`). PM duyệt các dòng giờ công `SUBMITTED` thuộc **dự án mình
quản lý** (TC-02) — duyệt được cả nguyên bảng lẫn từng dòng; dòng đã duyệt chuyển `APPROVED` và **không
sửa/xoá trực tiếp được** (QTN-10). Tổng giờ đã duyệt được cộng vào `approvedHours` của từng công việc —
nguồn cho `usageRatio` của `NCL-05-CN-005` và tính lợi nhuận dự án (TC-01).

Quy tắc nghiệp vụ (backend tự kiểm, Frontend không phải lặp lại):

- **TC-02 — phạm vi PM**: chỉ entry thuộc dự án có `projectManagerId` trùng với người gọi mới được duyệt.
  Khi **duyệt nguyên bảng**, các dòng thuộc dự án của PM khác được **giữ nguyên** `SUBMITTED` cho PM đó
  xử lý; bảng chỉ chuyển `APPROVED` khi **không còn** dòng `SUBMITTED` nào trong tuần (phần cuối cùng của
  PM cuối). Khi **duyệt từng dòng** (`entryIds`), dòng thuộc dự án người khác nhận `403 FORBIDDEN`.
- **TC-01**: sau khi duyệt, `approvedHours` của công việc được tính lại bằng tổng giờ `APPROVED`; khi tuần
  được duyệt hết, bảng nhận `status = APPROVED` cùng `approvedBy`/`approvedAt`.
- **TC-03 — vượt ngân sách vẫn duyệt được**: nếu một công việc sau duyệt đạt từ **80%** ngân sách giờ công
  trở lên (QTN-20), hệ thống **vẫn duyệt** và trả `overBudgetWarnings` — danh sách cảnh báo từng công việc
  (`data.overBudgetWarnings`) kèm dòng chữ cảnh báo trong `message`.
- **TC-04**: mỗi lần duyệt ghi một dòng nhật ký hệ thống `Duyet bang cham cong` — người duyệt, nội dung
  (tuần, số dòng, số giờ), thời điểm.
- Bảng phải đang `PENDING_APPROVAL` — đã duyệt/từ chối nhận `400 INVALID_STATE`.

#### `GET /timesheets/pending`

Hàng đợi của PM hiện tại: các bảng `PENDING_APPROVAL` có **ít nhất một** dòng `SUBMITTED` thuộc dự án
mình quản lý, kèm `pendingEntries`/`pendingHours` (phần con của chính PM này):

```json
{
  "success": true,
  "data": [
    {
      "timesheetId": 50,
      "userId": 7,
      "weekStartDate": "2026-09-07",
      "weekEndDate": "2026-09-13",
      "totalHours": 10,
      "pendingEntries": 1,
      "pendingHours": 5,
      "submittedAt": "2026-09-13T10:00:00"
    }
  ]
}
```

#### `POST /timesheets/{timesheetId}/approve`

```json
{ "entryIds": [30], "note": "Duyet cho dot nay" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `entryIds` | number[] | không | Bỏ qua/null/rỗng = **duyệt nguyên bảng** (tất cả dòng `SUBMITTED` thuộc dự án của PM); truyền id = duyệt từng dòng. |
| `note` | string | không | Ghi chú của PM, tối đa 1000 ký tự. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Duyet bang cham cong thanh cong — canh bao: Cong viec #20 Phan tich: 8/8 gio — da vuot nguong 80% ngan sach (QTN-20)",
  "data": {
    "timesheet": {
      "id": 50,
      "userId": 7,
      "weekStartDate": "2026-09-07",
      "weekEndDate": "2026-09-13",
      "status": "APPROVED",
      "totalHours": 10,
      "submittedBy": "nv01",
      "submittedAt": "2026-09-13T10:00:00"
    },
    "overBudgetWarnings": [
      "Cong viec #20 Phan tich: 8/8 gio — da vuot nguong 80% ngan sach (QTN-20)"
    ]
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `INVALID_STATE` | Bảng không ở trạng thái `PENDING_APPROVAL`, hoặc không còn dòng `SUBMITTED` nào. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-02` — hệ thống ghi nhật ký lần từ chối (TC-03 của chung); **hoặc** `VT-02` hợp lệ nhưng duyệt dòng thuộc dự án người khác (TC-02, `entryIds` riêng lẻ). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại bảng chấm công, hoặc `entryIds` chứa id không thuộc danh sách dòng chờ duyệt. |

**Lưu ý cho Frontend:**

- `message` có thể chứa cảnh báo vượt ngân sách dù request thành công — ưu tiên hiển thị cả
  `data.overBudgetWarnings` (danh sách có cấu trúc) thay vì parse `message`.
- Bảng hiển thị `data.timesheet.status = "PENDING_APPROVAL"` khi tuần còn phần của PM khác — nút duyệt
  vẫn hiển thị cho phần của mình (dựa trên `pendingEntries` của hàng đợi).
- Dòng đã `APPROVED` không sửa/xoá được — các API `PUT/DELETE time-entries` trả `400 INVALID_STATE` (QTN-10).
- Sau khi duyệt, lưới giờ công trên màn hình công việc (`NCL-05-CN-005`) tự phản ánh `approvedHours` mới
  qua `usageRatio`.

---

### `NCL-06-CN-004` — Từ chối bảng chấm công

Yêu cầu token của **Quản lý dự án** (`VT-02`). Cùng cơ chế phạm vi PM như `NCL-06-CN-003`: từ chối được
cả nguyên bảng lẫn từng dòng, chỉ áp dụng cho dòng `SUBMITTED` thuộc **dự án mình quản lý**. Dòng bị từ
chối quay về `DRAFT` để nhân viên sửa lại và nộp lại; bảng chỉ chuyển hẳn sang `REJECTED` khi không còn
dòng `SUBMITTED` nào (của bất kỳ PM nào) trong tuần.

#### `POST /timesheets/{timesheetId}/reject`

```json
{ "entryIds": [30], "reason": "Sai du an, can ghi lai" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `entryIds` | number[] | không | Bỏ qua/null/rỗng = **từ chối nguyên bảng** (mọi dòng `SUBMITTED` thuộc dự án của PM); truyền id = từ chối từng dòng. |
| `reason` | string | **có** | Lý do từ chối, tối đa 1000 ký tự — thiếu bị `400 VALIDATION_ERROR` trước khi chạm tới bảng chấm công. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Tu choi bang cham cong thanh cong",
  "data": {
    "timesheet": {
      "id": 50,
      "userId": 7,
      "weekStartDate": "2026-09-07",
      "weekEndDate": "2026-09-13",
      "status": "REJECTED",
      "totalHours": 10,
      "submittedBy": "nv01",
      "submittedAt": "2026-09-13T10:00:00"
    },
    "rejectedEntries": 2
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `reason` hoặc vượt 1000 ký tự. |
| 400 | `INVALID_STATE` | Bảng không ở trạng thái `PENDING_APPROVAL`, hoặc không còn dòng `SUBMITTED` nào. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-02`; **hoặc** `VT-02` hợp lệ nhưng từ chối dòng thuộc dự án người khác. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại bảng chấm công, hoặc `entryIds` chứa id không thuộc danh sách dòng chờ duyệt. |

**Lưu ý cho Frontend:**

- Sau khi từ chối, dòng quay về `DRAFT` — hiển thị lại được trên lưới giờ công tuần (`GET /me/time-entries`)
  để nhân viên sửa và nộp lại qua `POST /me/timesheets/{weekStartDate}/submit` (`NCL-06-CN-002`).
- `data.timesheet.status` có thể vẫn là `PENDING_APPROVAL` nếu tuần còn phần của PM khác chưa xử lý —
  tương tự cơ chế duyệt từng phần của `NCL-06-CN-003`.
- Kênh thông báo in-app cho người nộp biết bị từ chối **chưa triển khai** (chờ Epic `NCL-14`) — hiện tại
  chỉ có Nhật ký hệ thống ghi lại lý do/thời điểm, Frontend tạm thời có thể polling lại trạng thái bảng.

---

### `NCL-06-CN-005` — Điều chỉnh giờ công đã duyệt bằng bút toán đảo

Yêu cầu token của **Quản lý dự án** (`VT-02`), chỉ điều chỉnh được dòng thuộc dự án mình quản lý. Giờ công
đã `APPROVED` là **bất biến** (QTN-10) — không sửa/xoá trực tiếp; muốn sửa phải đi qua bút toán đảo (QTN-11):
hệ thống tự sinh một dòng **đảo** (số giờ âm, bù trừ đúng dòng gốc) và một dòng **sửa** (số giờ đúng), **giữ
nguyên dòng gốc** — cả ba dòng đều tra cứu lại được.

#### `POST /projects/{projectId}/tasks/{taskId}/time-entries/{entryId}/reversal`

```json
{ "correctedHours": 6, "reason": "Ghi nham 8 gio, thuc te lam 6 gio" }
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `correctedHours` | number | **có** | Số giờ đúng sau khi sửa, từ 0.01 trở lên. |
| `reason` | string | **có** | Lý do điều chỉnh, tối đa 1000 ký tự. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Dieu chinh gio cong thanh cong",
  "data": {
    "adjustmentId": 5,
    "originalEntry": { "id": 30, "hours": 8, "status": "APPROVED" },
    "reversalEntry": { "id": 31, "hours": -8, "status": "APPROVED" },
    "correctedEntry": { "id": 32, "hours": 6, "status": "APPROVED" },
    "reason": "Ghi nham 8 gio, thuc te lam 6 gio",
    "adjustedBy": "pm01",
    "adjustedAt": "2026-09-14T10:00:00"
  }
}
```

#### `GET /projects/{projectId}/tasks/{taskId}/adjustments`

Lịch sử điều chỉnh của một công việc, mới nhất trước — cùng cấu trúc `AdjustmentTraceRes` như trên, trả
mảng `data`.

**Response lỗi (áp dụng cho cả hai endpoint):**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `reason`, `correctedHours` <= 0, hoặc vượt giới hạn ký tự. |
| 400 | `INVALID_STATE` | Dòng gốc chưa `APPROVED`; dòng không phải bản gốc (đã từng bị điều chỉnh — chỉ điều chỉnh được dòng gốc, TC-02); hoặc kỳ chấm công chứa dòng gốc đã bị **khóa** (`NCL-06-CN-006`, QTN-12). |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-02`; **hoặc** `VT-02` hợp lệ nhưng công việc không thuộc dự án mình quản lý. |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại dự án/công việc/dòng giờ công. |

**Lưu ý cho Frontend:**

- Hiển thị cả ba dòng (`originalEntry`/`reversalEntry`/`correctedEntry`) khi xem lịch sử để người dùng
  hiểu rõ dấu vết — không ẩn dòng gốc hay dòng đảo dù chúng không còn "hiệu lực hiển thị".
- Nếu backend trả `400 INVALID_STATE` với nội dung nhắc tới kỳ đã khóa, hướng người dùng liên hệ Kế toán
  (chỉ `VT-05` mở lại được kỳ qua `NCL-06-CN-006`).

---

### `NCL-06-CN-006` — Khóa kỳ chấm công

Yêu cầu token của **Kế toán** (`VT-05`). Kỳ tính theo **tháng** — khóa/mở đồng loạt cả tháng, không khóa
theo tuần lẻ. Khi kỳ đã `LOCKED`, mọi thao tác ghi/sửa/điều chỉnh giờ công có ngày làm việc rơi vào kỳ đó
đều bị chặn (QTN-12), dù dòng đó đang ở trạng thái nào.

#### `GET /timesheet-periods`

Danh sách kỳ chấm công, mới nhất trước.

```json
{
  "success": true,
  "data": [
    { "id": 3, "periodStart": "2026-09-01", "periodEnd": "2026-09-30", "status": "OPEN", "lockedBy": null, "lockedAt": null }
  ]
}
```

#### `POST /timesheet-periods/lock`

```json
{ "year": 2026, "month": 9 }
```

Khóa kỳ của tháng chỉ định — nếu kỳ chưa tồn tại, hệ thống **tự tạo rồi khóa luôn**. Chặn khóa nếu còn
bảng chấm công `PENDING_APPROVAL` giao với khoảng ngày của kỳ.

#### `POST /timesheet-periods/{periodId}/unlock`

Mở lại một kỳ đã khóa (không cần body).

**Response thành công — `200 OK`** (cả 2 API POST): trả về `TimesheetPeriodRes` như ở `GET` phía trên.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu `year`/`month`, hoặc `month` ngoài khoảng 1-12. |
| 400 | `INVALID_STATE` | Khóa một kỳ đã `LOCKED` sẵn; mở một kỳ đang `OPEN`; hoặc khóa khi còn bảng `PENDING_APPROVAL` giao với kỳ. |
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải `VT-05`. |
| 404 | `RESOURCE_NOT_FOUND` | `periodId` không tồn tại (chỉ áp dụng `unlock`). |

**Lưu ý cho Frontend:**

- Trước khi cho Kế toán bấm khóa, gợi ý gọi thử và hiển thị rõ lỗi `INVALID_STATE` liệt kê **còn bảng nào
  đang chờ duyệt** (nếu backend trả danh sách trong `message`) để Kế toán biết cần nhắc PM xử lý trước.
- Sau khi khóa, các màn hình ghi giờ công / điều chỉnh bút toán đảo của tháng đó nên vô hiệu hoá nút
  ghi/sửa ngay khi nhận `400 INVALID_STATE` nhắc tới kỳ khóa, tránh người dùng thử lại nhiều lần.

---

### `NCL-06-CN-009` — Nhắc nộp bảng chấm công

Mỗi **Chủ Nhật 20h00** (giờ server), hệ thống tự động rà soát tuần Thứ Hai–Chủ Nhật vừa kết thúc: nhân sự
nào còn dòng giờ công `DRAFT` trong tuần nhưng **chưa nộp** (chưa gọi `POST /me/timesheets/{weekStartDate}/submit`,
hoặc bảng bị `REJECTED` mà chưa nộp lại) sẽ nhận thông báo in-app nhắc nộp (`NotificationType.TIMESHEET_REMINDER`).
PM phụ trách các dự án liên quan cũng nhận một thông báo tổng hợp danh sách nhân sự còn thiếu. Cơ chế
này **tự động, không cần Frontend gọi API để kích hoạt** — Frontend chỉ cần hiển thị thông báo qua API
Notification đã có (`NCL-06-CN-002` ở trên) và, nếu cần màn hình riêng, dùng endpoint tra cứu dưới đây.

Chống gửi trùng (QTN-27): trong cùng một tuần, mỗi người (nhân viên lẫn PM) chỉ nhận **đúng một** thông
báo nhắc dù hệ thống có chạy rà soát lại nhiều lần.

#### `GET /timesheets/unsubmitted?weekStartDate=2026-09-07`

Yêu cầu token của **Quản lý dự án** (`VT-02`) hoặc **Nhân viên chuyên môn** (`VT-03`). Trả về danh sách
`userId` còn chưa nộp bảng chấm công của tuần bắt đầu từ `weekStartDate` (luôn là một ngày Thứ Hai).

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    { "userId": 102, "weekStartDate": "2026-09-07", "weekEndDate": "2026-09-13" }
  ]
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Vai trò không phải `VT-02` hoặc `VT-03` — ghi nhật ký lần từ chối (TC-03). |

**Lưu ý cho Frontend:**

- `weekStartDate` bắt buộc là ngày Thứ Hai (giống tham số của `POST /me/timesheets/{weekStartDate}/submit`).
- Response chỉ trả `userId` (không kèm họ tên) — muốn hiển thị tên, ghép thêm với danh sách nhân sự đã
  có sẵn ở màn hình quản lý người dùng (`NCL-01-CN-002`).
- Endpoint này phục vụ **xem lại** danh sách (vd PM muốn chủ động kiểm tra tuần hiện tại), không thay thế
  cơ chế nhắc tự động — không cần gọi endpoint này để "kích hoạt" gửi nhắc.

---

## Epic `NCL-07` — Quản lý đơn giá

### `NCL-07-CN-001` — Khai báo bảng đơn giá theo vai trò

Yêu cầu token của **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`) — vai trò khác nhận `403 FORBIDDEN`
và bị ghi nhật ký lần từ chối vào Nhật ký hệ thống (`audit_logs`, TC-03, `AccessDeniedAuditRecorder`).

Mỗi dòng đơn giá gồm **vai trò chuyên môn**, **cấp bậc** và **đơn giá theo ngày công** — đơn vị tiền là
theo **ngày**, không phải theo giờ, để khớp với cách `NCL-03-CN-003` (Lập báo giá) đang tính
`amount = workDays * dailyRate`. Khoá duy nhất là `(professionalRole, level, effectiveFrom)` — cùng
vai trò + cấp bậc không được khai báo hai lần cho cùng một ngày hiệu lực (TC-02 phần dữ liệu trùng).
Khai báo thành công ghi một dòng vào Nhật ký hệ thống — người thực hiện, nội dung (vai trò/cấp bậc/đơn
giá/ngày hiệu lực), thời điểm (TC-04); Frontend không cần gọi thêm API nào để việc ghi log này xảy ra.

> **Không ảnh hưởng luồng báo giá hiện có.** `NCL-03-CN-003` tra cứu đơn giá **chỉ theo tên vai trò**
> (chưa biết khái niệm cấp bậc), lấy dòng có `effectiveFrom` gần nhất không vượt quá ngày lập báo giá.
> Nếu một vai trò có nhiều cấp bậc khai báo trùng ngày hiệu lực, báo giá sẽ lấy dòng bất kỳ trong số đó —
> Frontend màn hình báo giá không cần và không nên gửi `level`.

#### `POST /bill-rates`

```json
{
  "professionalRole": "Lap trinh vien cao cap",
  "level": "Cao cap",
  "dailyRate": 2500000,
  "effectiveFrom": "2026-01-01"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `professionalRole` | string | có | Vai trò chuyên môn, không để trống |
| `level` | string | có | Cấp bậc (vd "Trung cấp", "Cao cấp", "Quản lý"), không để trống |
| `dailyRate` | number | có | Đơn giá theo ngày công, không được âm |
| `effectiveFrom` | date (`yyyy-MM-dd`) | có | Ngày bắt đầu hiệu lực |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Tao bang don gia theo vai tro thanh cong",
  "data": {
    "professionalRole": "Lap trinh vien cao cap",
    "level": "Cao cap",
    "dailyRate": 2500000,
    "effectiveFrom": "2026-01-01"
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `professionalRole`/`level`/`effectiveFrom`; hoặc `dailyRate` âm (TC-02) |
| 409 | `DUPLICATE_DATA` | Đã tồn tại đơn giá cho cùng `professionalRole` + `level` tại `effectiveFrom` đã chọn |

#### `GET /bill-rates/current`

Danh sách mỗi cặp (vai trò, cấp bậc) đang có đơn giá hiệu lực tính đến hôm nay — dùng cho ô chọn vai trò
ở màn hình lập báo giá (`NCL-03-CN-003`) thay vì gõ tay tự do. Yêu cầu token **Nhân viên kinh doanh**
(`VT-04`), **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`).

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    { "professionalRole": "Lap trinh vien cao cap", "level": "Cao cap", "dailyRate": 2500000, "effectiveFrom": "2024-01-01" }
  ]
}
```

**Lưu ý cho Frontend:**
- `professionalRole` ở đây là chuỗi hiển thị/khớp chính xác dùng khi gửi `items[].professionalRole` cho
  `POST /opportunities/{opportunityId}/quotes` — `level` chỉ để hiển thị thêm, không gửi kèm khi lập báo giá.
- Đơn giá mới khai báo (`effectiveFrom` trong tương lai) sẽ **không** xuất hiện ở endpoint này cho tới đúng
  ngày hiệu lực — đây là chủ đích (QTN-15: đơn giá áp theo thời điểm phát sinh).

### `NCL-07-CN-002` — Đặt hiệu lực theo thời điểm cho đơn giá

Không có bảng/API riêng — đây là hệ quả trực tiếp của cách `NCL-07-CN-001` đã thiết kế: `POST /bill-rates`
**luôn tạo dòng mới**, không bao giờ ghi đè hay xoá dòng cũ (khoá duy nhất `(professionalRole, level,
effectiveFrom)` đã buộc mỗi mốc hiệu lực là một dòng riêng — TC-01, TC-03). Phần còn thiếu của story này
là **tra đúng dòng hiệu lực tại một ngày phát sinh cụ thể** (TC-02, QTN-15), bổ sung ở endpoint dưới đây.

#### `GET /bill-rates/resolve`

Trả về dòng đơn giá có hiệu lực tại một ngày phát sinh cụ thể — dùng khi tính doanh thu cho một dòng giờ
công đã ghi nhận trong quá khứ, để dòng đó **luôn áp giá đang hiệu lực tại đúng ngày nó phát sinh**, không
bị ảnh hưởng bởi lần tăng giá sau đó (TC-02). Yêu cầu token **Kế toán** (`VT-05`) hoặc **Quản trị viên**
(`VT-07`) — cùng nhóm quyền với thao tác khai báo, vì đây cũng là một phần của "quản lý hiệu lực của đơn
giá" (TC-04); vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối.

```
GET /bill-rates/resolve?professionalRole=Lap+trinh+vien+cao+cap&level=Cao+cap&asOf=2026-06-30
```

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `professionalRole` | string | có | Vai trò chuyên môn, khớp chính xác (không phân biệt hoa/thường) |
| `level` | string | có | Cấp bậc, khớp chính xác (không phân biệt hoa/thường) |
| `asOf` | date (`yyyy-MM-dd`) | có | Ngày phát sinh cần tra giá (vd ngày công của dòng giờ công) |

Backend chọn dòng có `effectiveFrom` **gần nhất nhưng không vượt quá** `asOf` — đúng dòng hiệu lực tại
thời điểm đó, kể cả khi đã có dòng hiệu lực mới hơn (ngày trong tương lai so với `asOf`) được khai báo sau.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "professionalRole": "Lap trinh vien cao cap",
    "level": "Cao cap",
    "dailyRate": 500000,
    "effectiveFrom": "2026-01-01"
  }
}
```

`effectiveFrom` trong response là ngày hiệu lực của **dòng được áp dụng** (có thể khác `asOf` đã gửi) —
Frontend nên hiển thị giá trị này để kế toán thấy rõ giá đang tính dựa trên mốc hiệu lực nào.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối (TC-04) |
| 400 | `VALIDATION_ERROR` | Thiếu `professionalRole`/`level`/`asOf` |
| 404 | `RESOURCE_NOT_FOUND` | Chưa có dòng đơn giá nào hiệu lực **trước hoặc đúng** `asOf` cho vai trò + cấp bậc đó |

**Lưu ý cho Frontend:**
- Khác với `GET /bill-rates/current` (luôn lấy theo **hôm nay**), endpoint này nhận `asOf` tuỳ ý — dùng
  cho màn hình xem lại/tính doanh thu của các kỳ trước, không phải màn hình lập báo giá mới.
- `404` không phải lỗi hệ thống — nghĩa là vai trò/cấp bậc đó **chưa từng có đơn giá** tại thời điểm
  `asOf` (vd `asOf` sớm hơn cả dòng đầu tiên từng khai báo); nên hiển thị thông báo "chưa có đơn giá tại
  thời điểm này" thay vì lỗi chung chung.

### `NCL-07-CN-003` — Khai báo đơn giá riêng theo hợp đồng

Yêu cầu token của **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`) — vai trò khác nhận `403 FORBIDDEN` và hệ thống ghi nhật ký lần từ chối (TC-03).

Khác với bảng đơn giá chung công ty (`NCL-07-CN-001`), đơn giá riêng theo hợp đồng (`contract_bill_rates`) cho phép định nghĩa mức giá đàm phán riêng cho một hợp đồng cụ thể. Quy tắc ưu tiên (QTN-16): Khi tính doanh thu cho một dòng giờ công của vai trò/cấp bậc trong hợp đồng, hệ thống ưu tiên lấy đơn giá riêng theo hợp đồng (nếu có), nếu không khai báo đơn giá riêng thì hệ thống quay về dùng đơn giá chung của công ty (TC-01, TC-02).

Thao tác khai báo/thay đổi đơn giá riêng thành công sẽ tự động ghi nhật ký lịch sử (`audit_logs`) thông tin người thực hiện, nội dung thay đổi và thời điểm (TC-04).

#### `POST /contracts/{contractId}/bill-rates`

Khai báo đơn giá riêng cho hợp đồng `{contractId}`.

```json
{
  "professionalRole": "Lap trinh vien cao cap",
  "level": "Cao cap",
  "dailyRate": 3000000,
  "effectiveFrom": "2026-01-01"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `professionalRole` | string | có | Vai trò chuyên môn, không để trống |
| `level` | string | có | Cấp bậc, không để trống |
| `dailyRate` | number | có | Đơn giá theo ngày công, không được âm |
| `effectiveFrom` | date (`yyyy-MM-dd`) | có | Ngày bắt đầu hiệu lực |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Khai bao don gia rieng theo hop dong thanh cong",
  "data": {
    "contractId": 1,
    "professionalRole": "Lap trinh vien cao cap",
    "level": "Cao cap",
    "dailyRate": 3000000,
    "effectiveFrom": "2026-01-01"
  }
}
```

#### `GET /contracts/{contractId}/bill-rates/resolve`

Tra cứu đơn giá áp dụng cho hợp đồng `{contractId}` tại ngày phát sinh `asOf`. Tự động áp dụng quy tắc QTN-16: ưu tiên đơn giá riêng theo hợp đồng, nếu không có sẽ tự rơi về đơn giá chung công ty.

```
GET /contracts/{contractId}/bill-rates/resolve?professionalRole=Lap+trinh+vien+cao+cap&level=Cao+cap&asOf=2026-06-30
```

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `professionalRole` | string | có | Vai trò chuyên môn |
| `level` | string | có | Cấp bậc |
| `asOf` | date (`yyyy-MM-dd`) | có | Ngày phát sinh cần tính doanh thu |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "dailyRate": 3000000,
    "effectiveFrom": "2026-01-01",
    "isContractSpecific": true
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `dailyRate` | number | Mức đơn giá được áp dụng |
| `effectiveFrom` | date | Ngày hiệu lực của mốc đơn giá được áp dụng |
| `isContractSpecific` | boolean | `true` nếu áp dụng đơn giá riêng hợp đồng (TC-01), `false` nếu rơi về đơn giá chung công ty (TC-02) |

**Response lỗi (áp dụng cho cả 2 endpoint trên):**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối (TC-03) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy Hợp đồng `{contractId}`, hoặc không tìm thấy đơn giá chung lẫn riêng hợp lệ tại mốc `asOf` |
| 400 | `VALIDATION_ERROR` | Thiếu thông tin bắt buộc hoặc `dailyRate` âm |
| 409 | `DUPLICATE_DATA` | Đã tồn tại đơn giá riêng cho cùng `professionalRole` + `level` + `effectiveFrom` trong hợp đồng |

### `NCL-07-CN-004` — Khai báo chi phí giờ công nội bộ

Khai báo và tra cứu chi phí giờ công nội bộ của từng nhân sự theo mốc thời gian (`employee_hourly_rates`), phục vụ việc tính giá vốn dự án (QTN-17).

Quyền truy cập:
- Khai báo (`POST`): Yêu cầu token **Nhân sự** (`VT-06`) hoặc **Quản trị viên** (`VT-07`).
- Xem lịch sử & tra cứu giá vốn (`GET`): Cho phép **Nhân sự** (`VT-06`), **Kế toán** (`VT-05`), **Ban giám đốc** (`VT-01`), **Quản trị viên** (`VT-07`).
- Vai trò khác (ví dụ Quản lý dự án `VT-02`) bị chặn `403 FORBIDDEN` và tự động ghi nhật ký lần từ chối (TC-02).

Nhật ký dữ liệu nhạy cảm (TC-04): Mọi thao tác khai báo, chỉnh sửa hoặc xem danh sách chi phí giờ công đều được tự động ghi nhận vào `sensitive_data_access_logs` (loại dữ liệu `SALARY` / `COST`).

#### `POST /employees/{employeeId}/rates`

Khai báo mốc chi phí giờ công nội bộ cho nhân sự `{employeeId}`. Hệ thống lưu bản ghi mới và giữ nguyên bản ghi lịch sử cũ (TC-01).

```json
{
  "hourlyRate": 250000,
  "effectiveFrom": "2026-01-01"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `hourlyRate` | number | có | Chi phí giờ công nội bộ, không được âm |
| `effectiveFrom` | date (`yyyy-MM-dd`) | có | Ngày bắt đầu hiệu lực của mức chi phí |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Khai bao chi phi gio cong noi bo thanh cong",
  "data": {
    "id": 10,
    "employeeId": 1,
    "hourlyRate": 250000,
    "effectiveFrom": "2026-01-01"
  }
}
```

#### `GET /employees/{employeeId}/rates`

Xem danh sách lịch sử chi phí giờ công nội bộ của nhân sự `{employeeId}` (mới nhất xếp trước).

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    { "id": 10, "employeeId": 1, "hourlyRate": 250000, "effectiveFrom": "2026-01-01" }
  ]
}
```

#### `GET /employees/{employeeId}/rates/resolve?asOf=2026-06-01`

Tra cứu chi phí giờ công của nhân sự `{employeeId}` tại mốc thời điểm `asOf` phát sinh dòng giờ công.

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `asOf` | date (`yyyy-MM-dd`) | có | Ngày phát sinh dòng giờ công cần tính giá vốn |

**Response thành công — `200 OK` (có dữ liệu):**

```json
{
  "success": true,
  "data": {
    "employeeId": 1,
    "hourlyRate": 250000,
    "effectiveFrom": "2026-01-01",
    "missingCostData": false
  }
}
```

**Response thành công — `200 OK` (ngoại lệ TC-03: `asOf` sớm hơn mọi mốc hiệu lực đã khai báo):**

```json
{
  "success": true,
  "data": {
    "employeeId": 1,
    "hourlyRate": null,
    "effectiveFrom": null,
    "missingCostData": true
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Người dùng không có vai trò được phép (ví dụ VT-02) — ghi nhật ký từ chối (TC-02) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy hồ sơ nhân sự `{employeeId}` |
| 400 | `VALIDATION_ERROR` | Thiếu `hourlyRate` / `effectiveFrom` hoặc `hourlyRate` âm |
| 409 | `DUPLICATE_DATA` | Đã tồn tại khai báo chi phí giờ công cho nhân sự tại ngày hiệu lực đã chọn |

### `NCL-07-CN-005` — Tra cứu đơn giá áp dụng cho một dòng giờ công

Cho một dòng giờ công (`timesheet_entries`) đã ghi nhận, tra ra **đúng đơn giá đang được dùng để tính
doanh thu** cho dòng đó — không cần Frontend tự tra `professionalRole`/`contractId`/`asOf` rồi gọi tiếp
`GET /contracts/{contractId}/bill-rates/resolve`. Backend tự suy ra:

- `professionalRole`: lấy từ hồ sơ nhân sự (`employees.professional_role`) của người ghi dòng giờ công đó.
- `contractId`: lấy từ `dòng giờ công → công việc (task) → dự án (project) → hợp đồng`.
- `asOf`: chính là `workDate` (ngày công) của dòng giờ công — đảm bảo dòng luôn áp giá đang hiệu lực tại
  đúng ngày nó phát sinh, không bị ảnh hưởng bởi lần tăng giá sau đó (kế thừa nguyên tắc QTN-15 của
  `NCL-07-CN-002`).

Sau khi suy ra 3 giá trị trên, endpoint áp dụng đúng quy tắc ưu tiên **QTN-16** đã có ở `NCL-07-CN-003`
(ưu tiên đơn giá riêng theo hợp đồng, không có thì rơi về đơn giá chung công ty).

`level` (cấp bậc) **không tự suy ra được** — hồ sơ nhân sự hiện chưa lưu cấp bậc — nên Frontend phải gửi
kèm qua query param (ví dụ lấy từ lựa chọn của Kế toán khi xem dòng giờ công đó).

Yêu cầu token **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`) — cùng nhóm quyền với các endpoint
tra cứu đơn giá khác vì đây cũng là một phần của "quản lý hiệu lực của đơn giá" phục vụ tính doanh thu;
vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối.

#### `GET /timesheet-entries/{entryId}/bill-rate/resolve`

```
GET /timesheet-entries/100/bill-rate/resolve?level=Cao+cap
```

| Tham số | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `entryId` | path, number | có | ID dòng giờ công (`timesheet_entries.id`) cần tra đơn giá |
| `level` | query, string | có | Cấp bậc của người thực hiện dòng giờ công đó, không để trống |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "timeEntryId": 100,
    "taskId": 5,
    "projectId": 2,
    "contractId": 1,
    "professionalRole": "Lap trinh vien cao cap",
    "level": "Cao cap",
    "workDate": "2026-06-30",
    "hours": 8.00,
    "workType": "OVERTIME",
    "dailyRate": 3000000,
    "effectiveFrom": "2026-01-01",
    "isContractSpecific": true,
    "rateFactor": 1.50,
    "appliedDailyRate": 4500000.00
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `workDate` | date | Ngày công của dòng giờ công — cũng chính là mốc `asOf` dùng để tra đơn giá |
| `hours` | number | Số giờ công đã ghi của dòng, trả kèm để đối chiếu (không dùng để tính `dailyRate`) |
| `workType` | string (enum) | Loại hình công việc của dòng giờ công — `NORMAL`/`OVERTIME`/`WEEKEND`/`HOLIDAY` (`NCL-07-CN-006`) |
| `dailyRate` | number | Đơn giá theo vai trò/cấp bậc **trước khi** nhân hệ số loại hình công việc |
| `effectiveFrom` | date | Ngày hiệu lực của mốc đơn giá được áp dụng (có thể khác `workDate`) |
| `isContractSpecific` | boolean | `true` nếu áp dụng đơn giá riêng hợp đồng, `false` nếu rơi về đơn giá chung công ty (QTN-16) |
| `rateFactor` | number | Hệ số nhân theo `workType` (`NCL-07-CN-006`), tra từ `GET /work-type-rates` |
| `appliedDailyRate` | number | **Đơn giá cuối cùng** = `dailyRate * rateFactor` (làm tròn 2 chữ số thập phân) — dùng số này để tính doanh thu, không dùng `dailyRate` |

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối |
| 400 | `VALIDATION_ERROR` | Thiếu `level` (rỗng/chỉ khoảng trắng) |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy dòng giờ công `{entryId}`, hoặc không tìm thấy hồ sơ nhân sự của người thực hiện, hoặc chưa có đơn giá nào (chung lẫn riêng hợp đồng) hiệu lực trước hoặc đúng `workDate` cho vai trò + cấp bậc đó, hoặc chưa khai báo hệ số cho `workType` của dòng đó (`NCL-07-CN-006`) |

**Lưu ý cho Frontend:**
- Đây là endpoint tổng hợp — Frontend **không cần** tự gọi `GET /contracts/{contractId}/bill-rates/resolve`
  nữa cho màn hình xem chi tiết dòng giờ công; chỉ cần biết `entryId` và hỏi người dùng chọn `level`.
- `404` không phải lỗi hệ thống — có thể do dòng giờ công không tồn tại, người thực hiện chưa có hồ sơ nhân
  sự đầy đủ, hoặc vai trò/cấp bậc đó chưa từng có đơn giá tại thời điểm `workDate`; nên hiển thị thông báo
  phù hợp với từng trường hợp thay vì lỗi chung chung.
- `effectiveFrom` trong response có thể khác `workDate` đã gửi — luôn hiển thị giá trị này để kế toán thấy
  rõ giá đang tính dựa trên mốc hiệu lực nào.
- Kể từ `NCL-07-CN-006`, response có thêm `workType`/`rateFactor`/`appliedDailyRate` — đây là bổ sung thêm
  trường (backward-compatible), Frontend đang tích hợp từ trước không cần đổi gì nếu chưa dùng các trường
  mới; nhưng **nên chuyển sang hiển thị `appliedDailyRate`** thay vì `dailyRate` vì đó mới là đơn giá cuối
  cùng dùng để tính doanh thu cho dòng giờ công.

### `NCL-07-CN-006` — Đơn giá theo loại hình công việc

Cho phép khai báo **hệ số nhân đơn giá** theo loại hình công việc của một dòng giờ công — ví dụ giờ ngoài
giờ hành chính (`OVERTIME`) nhân `1.5`, giờ cuối tuần (`WEEKEND`) nhân `2.0`, giờ lễ/Tết (`HOLIDAY`) nhân
`3.0` — áp dụng lên đơn giá theo vai trò/cấp bậc (`NCL-07-CN-001`..`003`) để ra đơn giá cuối cùng cho dòng
đó. Bốn loại hình cố định (`NORMAL`/`OVERTIME`/`WEEKEND`/`HOLIDAY`) đã có sẵn hệ số mặc định
(`1.00`/`1.50`/`2.00`/`3.00`) khi triển khai — Kế toán/Quản trị viên có thể sửa lại qua endpoint dưới đây.

Dòng giờ công (`timesheet_entries`) nay có thêm trường `workType` (mặc định `NORMAL` nếu không chọn) khi
ghi/sửa giờ công (`POST`/`PUT .../time-entries`, Epic `NCL-06`) — người ghi giờ công (Nhân viên chuyên môn,
`VT-03`) tự chọn loại hình phù hợp với dòng mình ghi. `GET /timesheet-entries/{entryId}/bill-rate/resolve`
(`NCL-07-CN-005`) tự động nhân hệ số này vào `dailyRate` để ra `appliedDailyRate` — Frontend **không cần**
tự nhân hệ số.

Khai báo/sửa hệ số yêu cầu token **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`) — cùng nhóm quyền
với các endpoint quản lý đơn giá khác; vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối. Xem
danh sách hệ số cho phép thêm **Nhân viên chuyên môn** (`VT-03`) vì họ cần biết các lựa chọn hợp lệ khi ghi
giờ công.

#### `POST /work-type-rates`

Khai báo hệ số cho một loại hình công việc — nếu loại hình đó đã có hệ số thì **ghi đè** giá trị cũ (không
giữ lịch sử theo ngày hiệu lực như `BillRate`, vì đây là hệ số nghiệp vụ ít thay đổi chứ không phải mức giá
đàm phán).

```json
{
  "workType": "OVERTIME",
  "factor": 1.5
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `workType` | string (enum) | có | Một trong `NORMAL`/`OVERTIME`/`WEEKEND`/`HOLIDAY` |
| `factor` | number | có | Hệ số nhân, phải lớn hơn 0 |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Khai bao he so don gia theo loai hinh cong viec thanh cong",
  "data": {
    "workType": "OVERTIME",
    "factor": 1.5
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối |
| 400 | `VALIDATION_ERROR` | Thiếu `workType`/`factor`, `workType` không thuộc 4 giá trị hợp lệ, hoặc `factor` ≤ 0 |

#### `GET /work-type-rates`

Danh sách hệ số hiện tại của tất cả loại hình công việc, sắp theo tên loại hình.

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": [
    { "workType": "NORMAL", "factor": 1.00 },
    { "workType": "OVERTIME", "factor": 1.50 },
    { "workType": "WEEKEND", "factor": 2.00 },
    { "workType": "HOLIDAY", "factor": 3.00 }
  ]
}
```

**Lưu ý cho Frontend:**
- Dùng danh sách này để dựng ô chọn `workType` ở màn hình ghi giờ công (Epic `NCL-06`) — tránh gõ tay sai
  giá trị enum.
- Nếu một loại hình chưa từng được khai báo hệ số (trường hợp hiếm — chỉ xảy ra nếu dữ liệu mặc định bị xoá
  thủ công), `GET /timesheet-entries/{entryId}/bill-rate/resolve` cho dòng giờ công thuộc loại hình đó sẽ
  trả `404 RESOURCE_NOT_FOUND` thay vì coi hệ số là `1.00` — hiển thị thông báo "chưa khai báo hệ số cho
  loại hình công việc này" thay vì lỗi chung chung.

### `NCL-07-CN-007` — Xem lịch sử thay đổi đơn giá

Trả về toàn bộ các mốc đơn giá đã từng khai báo cho một cặp (vai trò, cấp bậc), giúp Kế toán giải trình vì
sao doanh thu giữa hai kỳ khác nhau (ví dụ do công ty tăng giá giữa chừng — `NCL-07-CN-002`). Không có bảng
lưu lịch sử riêng: mỗi lần `POST /bill-rates` tạo dòng mới (không bao giờ ghi đè — `NCL-07-CN-001`/`002`),
nên "lịch sử" chính là toàn bộ các dòng `bill_rates` của cặp đó, sắp theo `effectiveFrom`; "người thay đổi"
tra lại từ `audit_logs` mà `POST /bill-rates` đã tự ghi tại thời điểm tạo — không cần Frontend hay Backend
ghi thêm gì mới khi xem màn hình này.

Yêu cầu token **Kế toán** (`VT-05`) hoặc **Quản trị viên** (`VT-07`) — cùng nhóm quyền với các endpoint quản
lý đơn giá khác; vai trò khác nhận `403 FORBIDDEN` và bị ghi nhật ký lần từ chối (TC-03).

#### `GET /bill-rates/history`

```
GET /bill-rates/history?professionalRole=Lap+trinh+vien+cao+cap&level=Cao+cap
```

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `professionalRole` | string | có | Vai trò chuyên môn, khớp chính xác (không phân biệt hoa/thường) |
| `level` | string | có | Cấp bậc, khớp chính xác (không phân biệt hoa/thường) |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "data": {
    "professionalRole": "Lap trinh vien cao cap",
    "level": "Cao cap",
    "everChanged": true,
    "entries": [
      {
        "id": 1,
        "dailyRate": 500000,
        "effectiveFrom": "2025-01-01",
        "effectiveTo": "2025-12-31",
        "current": false,
        "changedBy": "ke.toan01",
        "changedAt": "2025-01-01T09:00:00"
      },
      {
        "id": 2,
        "dailyRate": 600000,
        "effectiveFrom": "2026-01-01",
        "effectiveTo": null,
        "current": true,
        "changedBy": "ke.toan02",
        "changedAt": "2025-12-20T14:00:00"
      }
    ]
  }
}
```

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `everChanged` | boolean | `false` khi `entries` chỉ có đúng 1 phần tử — Frontend hiển thị rõ "chưa từng thay đổi" thay vì bảng có 1 dòng trông giống lỗi tải thiếu dữ liệu (TC-02) |
| `entries[].id` | number | Mã dòng đơn giá, không cần hiển thị cho người dùng — chỉ để làm `key` khi render danh sách |
| `entries[].effectiveFrom` | date | Ngày bắt đầu hiệu lực của mốc này |
| `entries[].effectiveTo` | date \| null | Ngày cuối cùng còn hiệu lực (`effectiveFrom` của mốc kế tiếp trừ 1 ngày); `null` nếu đây là mốc mới nhất |
| `entries[].current` | boolean | `true` cho đúng một phần tử — mốc mới nhất, đang áp dụng (luôn đi kèm `effectiveTo = null`) |
| `entries[].changedBy` | string \| null | Tên đăng nhập người đã khai báo mốc này; `null` nếu dòng được tạo từ dữ liệu seed trước khi có audit log — Frontend nên hiển thị "—" thay vì để trống |
| `entries[].changedAt` | datetime \| null | Thời điểm khai báo; `null` cùng điều kiện với `changedBy` |

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`) hoặc Quản trị viên (`VT-07`) — ghi nhật ký lần từ chối (TC-03) |
| 400 | `VALIDATION_ERROR` | Thiếu `professionalRole` hoặc `level` |
| 404 | `RESOURCE_NOT_FOUND` | Vai trò + cấp bậc đó chưa từng có đơn giá nào được khai báo |

**Lưu ý cho Frontend:**
- `entries` luôn sắp theo `effectiveFrom` **tăng dần** (cũ nhất trước) — nếu muốn hiển thị mới nhất trước
  thì tự đảo mảng phía Frontend.
- Khác với `GET /bill-rates/current` (chỉ trả các cặp **đang** hiệu lực hôm nay), endpoint này trả **toàn
  bộ** lịch sử kể cả các mốc đã hết hiệu lực từ lâu — dùng cho màn hình tra cứu/giải trình, không phải màn
  hình chọn giá khi lập báo giá.
- `404` không phải lỗi hệ thống — nghĩa là vai trò/cấp bậc đó **chưa từng được khai báo đơn giá lần nào**;
  nên phân biệt với trường hợp "có 1 mốc" (vẫn trả `200` kèm `everChanged: false`).

---

## Epic `NCL-10` — Hóa đơn và thanh toán

### `NCL-10-CN-001` — Tạo đề nghị xuất hóa đơn từ giờ công đã duyệt

Yêu cầu token của **Kế toán** (`VT-05`). Kế toán chọn một dự án và một kỳ (khoảng ngày công); hệ thống gom các
dòng giờ công **đã duyệt**, **có tính phí** và **chưa từng nằm trong một đề nghị nào** của dự án đó thành một
**đề nghị xuất hóa đơn** kèm danh sách dòng và tổng tiền (QTN-18). Chỉ áp dụng cho hợp đồng theo giờ
(`TIME_AND_MATERIAL`) — hợp đồng trọn gói/theo mốc đi qua `NCL-10-CN-002`, hợp đồng duy trì đi qua `NCL-10-CN-005`.

**Dòng nào được gom** — xét theo `workDate` nằm trong `periodFrom`..`periodTo` (gồm cả hai đầu):

| Dòng giờ công | Xử lý | Đếm ở `skipped` |
|---|---|---|
| Đã duyệt (`APPROVED`), có tính phí, chưa vào đề nghị nào, tra được đơn giá | **Được gom** | — |
| Chưa duyệt (nháp, chờ duyệt hoặc bị từ chối) | Bỏ qua (TC-02) | `notApprovedCount` |
| Đã duyệt nhưng không tính phí (`billable=false`) | Bỏ qua | `nonBillableCount` |
| Đã nằm trong một đề nghị trước đó (TC-03) | Bỏ qua | `alreadyProposedCount` |
| Đã duyệt, có tính phí nhưng chưa tra được đơn giá bán (nhân sự chưa khai báo cấp bậc, chưa có đơn giá hiệu lực...) | Bỏ qua — **không** làm lỗi cả đề nghị | `missingRateCount` |

**Thành tiền mỗi dòng giờ công** = `hours × unitRate`, trong đó `unitRate` = đơn giá **ngày** áp dụng tại đúng
`workDate` của dòng ÷ 8 (1 ngày công = 8 giờ). Đơn giá ngày lấy từ cùng nguồn với doanh thu ghi nhận
`NCL-09-CN-002`: ưu tiên đơn giá riêng của hợp đồng rồi mới đến bảng giá chung (QTN-16), có hiệu lực tại ngày công
(QTN-15) và đã nhân hệ số loại hình công việc (`NCL-07-CN-006`) — nên số tiền trên đề nghị khớp với báo cáo doanh thu.
Dòng đảo/điều chỉnh đã duyệt (bút toán đảo, QTN-11) mang giờ **âm** nên thành tiền **âm**; vì vậy `laborAmount` và
`totalAmount` có thể nhỏ hơn tổng các dòng dương, và trong trường hợp kỳ chỉ còn dòng đảo có thể âm.

**Phiếu chi phí tính lại cho khách hàng:** cùng lượt gom, các phiếu chi phí của dự án có `expenseDate` trong kỳ,
đã được duyệt (`APPROVED`), đã được đánh dấu tính lại (`billable=true`, `NCL-08-CN-003`) và chưa nằm trong đề nghị
nào (`invoiced=false`) cũng được đưa vào đề nghị dưới dạng dòng `EXPENSE` (thành tiền = số tiền phiếu). Các phiếu này
được đặt `invoiced=true`, nên từ đó `PUT /expenses/{expenseId}/billable` với `billable=false` bị từ chối
(`400 INVALID_STATE`, xem `NCL-08-CN-003`).

**Chống gom trùng:** mỗi dòng giờ công và mỗi phiếu chi phí chỉ nằm được trong **một** đề nghị (ràng buộc `UNIQUE`
ở cơ sở dữ liệu). Các lượt tạo đề nghị của cùng một hợp đồng được xếp hàng tuần tự (khoá ghi dòng hợp đồng) nên hai
kế toán bấm cùng lúc không thể gom trùng một dòng — người bấm sau sẽ thấy các dòng đó ở `alreadyProposedCount`.

Mỗi lần tạo thành công ghi Nhật ký hệ thống (`action` = "Tao de nghi xuat hoa don tu gio cong", `targetType` =
`INVOICE`, `targetId` = id đề nghị; người thực hiện và vai trò do hệ thống tự điền từ phiên đăng nhập, nội dung nêu dự án, kỳ,
số dòng, tổng tiền và số dòng bị bỏ qua — TC-05) và gửi **thông báo trong ứng dụng** (`type` = `INVOICE_PROPOSAL_CREATED`,
`referenceType` = `InvoiceProposal`, `referenceId` = id đề nghị) cho quản lý dự án (`Project.projectManagerId`). Lần bị
từ chối quyền ghi "Từ chối truy cập" — chức năng "Tạo đề nghị xuất hóa đơn từ giờ công" (TC-04).

#### `POST /projects/{projectId}/invoice-proposals`

**Request:**

```json
{
  "periodFrom": "2026-09-01",
  "periodTo": "2026-09-30",
  "note": "Ky thang 9"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `projectId` | number | có | Lấy từ URL; dự án phải tồn tại. |
| `periodFrom` | date (`yyyy-MM-dd`) | có | Ngày công đầu tiên của kỳ. |
| `periodTo` | date (`yyyy-MM-dd`) | có | Ngày công cuối cùng của kỳ; không được trước `periodFrom`. |
| `note` | string | không | Ghi chú, tối đa 1000 ký tự; khoảng trắng hai đầu bị cắt. |

**Response thành công — `200 OK`** (ví dụ rút gọn: kỳ có 3 dòng giờ công đã duyệt và 5 dòng còn chờ duyệt — TC-02; mảng `laborLines` chỉ hiển thị 1 trong 3 dòng):

```json
{
  "success": true,
  "message": "Tao de nghi xuat hoa don thanh cong: bo qua 5 dong gio cong (5 chua duyet, 0 khong tinh phi, 0 da nam trong de nghi truoc, 0 chua co don gia)",
  "data": {
    "id": 100,
    "proposalCode": "IP-20261001-A1B2C3",
    "projectId": 1,
    "contractId": 5,
    "customerId": 9,
    "periodFrom": "2026-09-01",
    "periodTo": "2026-09-30",
    "status": "PENDING",
    "laborAmount": 7200000.00,
    "expenseAmount": 2000000.00,
    "totalAmount": 9200000.00,
    "note": "Ky thang 9",
    "laborLines": [
      {
        "id": 1001,
        "lineType": "LABOR",
        "timeEntryId": 11,
        "projectExpenseId": null,
        "lineDate": "2026-09-10",
        "userId": 3,
        "hours": 8.00,
        "unitRate": 300000.0000,
        "description": "Gio cong ngay 2026-09-10 - Phat trien API",
        "amount": 2400000.00
      }
    ],
    "expenseLines": [
      {
        "id": 1004,
        "lineType": "EXPENSE",
        "timeEntryId": null,
        "projectExpenseId": 50,
        "lineDate": "2026-09-12",
        "userId": null,
        "hours": null,
        "unitRate": null,
        "description": "Chi phi TRAVEL: Ve may bay cong tac",
        "amount": 2000000.00
      }
    ],
    "skipped": {
      "notApprovedCount": 5,
      "nonBillableCount": 0,
      "alreadyProposedCount": 0,
      "missingRateCount": 0
    },
    "createdBy": "ketoan01",
    "createdAt": "2026-10-01T10:00:00"
  }
}
```

`laborLines` và `expenseLines` sắp theo ngày tăng dần; `laborAmount` = tổng `amount` của `laborLines`,
`expenseAmount` = tổng `amount` của `expenseLines`, `totalAmount` = `laborAmount + expenseAmount`. `message` chỉ
kèm phần "bo qua N dong gio cong (...)" khi có ít nhất một dòng bị bỏ qua; số chi tiết luôn có ở `data.skipped`.
`status` của đề nghị mới luôn là `PENDING` (chờ lập hóa đơn).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi "Từ chối truy cập" (TC-04). |
| 404 | `RESOURCE_NOT_FOUND` | Không có dự án `{projectId}` hoặc không tìm thấy hợp đồng của dự án. |
| 400 | `INVALID_STATE` | Hợp đồng của dự án không phải `TIME_AND_MATERIAL`; hoặc kỳ **không có dòng giờ công/phiếu chi phí nào đủ điều kiện** (khi đó `message` nêu số dòng bị bỏ qua theo từng lý do và **không** tạo đề nghị rỗng). |
| 400 | `VALIDATION_ERROR` | Thiếu `periodFrom`/`periodTo` (kèm `fieldErrors`), ngày sai định dạng hoặc không có body, `periodFrom` sau `periodTo`, hoặc `note` quá dài. |

**Ghi chú cho Frontend:**
- Sau khi tạo, nếu `skipped.total > 0` nên hiển thị cảnh báo "bỏ qua N dòng" kèm chi tiết từng lý do; với
  `notApprovedCount > 0` gợi ý quản lý dự án duyệt nốt bảng chấm công rồi tạo lại đề nghị cho các dòng còn lại; với
  `missingRateCount > 0` gợi ý bổ sung cấp bậc nhân sự / đơn giá (`NCL-07-CN-001`, `NCL-01-CN-007`).
- Tạo lại đề nghị cho **cùng kỳ** là hợp lệ: các dòng đã vào đề nghị trước hiện ở `alreadyProposedCount`, chỉ các dòng
  mới duyệt thêm được gom. Nếu không còn dòng nào, API trả `400 INVALID_STATE` (không phải đề nghị rỗng).
- `totalAmount` có thể `<= 0` khi kỳ chỉ còn dòng đảo (QTN-11) — hiển thị số âm, không coi là lỗi.
- Thông báo `INVOICE_PROPOSAL_CREATED` đọc qua `GET /notifications` như các thông báo khác; loại này chưa có biểu
  tượng riêng ở màn hình Thông báo nên sẽ dùng biểu tượng chuông mặc định.
- Chưa có API đọc/liệt kê đề nghị hoặc lập hóa đơn từ đề nghị (các story sau của Epic `NCL-10`); dùng `data` của response
  trên để hiển thị.

### `NCL-10-CN-002` — Lập hóa đơn theo mốc hợp đồng

Yêu cầu token của **Kế toán** (`VT-05`). Kế toán chọn một mốc thanh toán đã **đủ điều kiện lập hóa đơn**
(`READY_TO_INVOICE`, xem `NCL-04-CN-003`) và hệ thống lập hóa đơn có giá trị **đúng bằng giá trị mốc**; mốc
chuyển sang `INVOICED` trong cùng giao dịch. Chỉ áp dụng cho hợp đồng `FIXED_PRICE` (trọn gói) hoặc
`MILESTONE` (theo mốc) — hợp đồng theo giờ đi qua `NCL-10-CN-001`, hợp đồng duy trì đi qua `NCL-10-CN-005`.

**QTN-19:** tổng hóa đơn **chưa huỷ** đã lập của hợp đồng cộng hóa đơn mới không được vượt `totalValue`
(đã gồm phụ lục, `NCL-04-CN-004`) — và không vượt `limitValue` nếu hợp đồng có đặt hạn mức. Vượt thì bị chặn
với thông báo yêu cầu lập phụ lục điều chỉnh trước. Các lượt lập hóa đơn của cùng một hợp đồng được xếp hàng
tuần tự (khoá ghi dòng hợp đồng) nên hai kế toán bấm cùng lúc không thể lập trùng mốc hay cùng vượt giá trị.

Mỗi lần lập thành công ghi Nhật ký hệ thống (`action` = "Lập hóa đơn theo mốc hợp đồng", `targetType` =
`INVOICE`, `targetId` = id hóa đơn) và `MILESTONE_STATUS_UPDATE` vào `contract_audit_logs`. Lần bị từ chối
quyền ghi "Từ chối truy cập" — chức năng "Lập hóa đơn theo mốc hợp đồng" (TC-03).

#### `POST /contracts/{contractId}/milestones/{milestoneId}/invoice`

**Request** — toàn bộ body là tùy chọn (có thể không gửi body):

```json
{
  "invoiceDate": "2026-09-30",
  "dueDate": "2026-10-30",
  "note": "Thanh toan dot 1"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `invoiceDate` | date | không | Ngày hóa đơn; mặc định là ngày hôm nay. |
| `dueDate` | date | không | Hạn thanh toán (`NCL-10-CN-004` dựa vào đây để tính công nợ quá hạn); mặc định `invoiceDate` + 30 ngày; không được trước `invoiceDate`. |
| `note` | string | không | Ghi chú, tối đa 1000 ký tự. |

**Response thành công — `200 OK`:**

```json
{
  "success": true,
  "message": "Lap hoa don theo moc hop dong thanh cong",
  "data": {
    "id": 100,
    "invoiceCode": "INV-20260921-A1B2C3",
    "contractId": 5,
    "milestoneId": 101,
    "milestoneName": "Nghiem thu giai doan 1",
    "status": "ISSUED",
    "totalAmount": 300000000.00,
    "invoiceDate": "2026-09-21",
    "dueDate": "2026-10-21",
    "note": null,
    "contractValue": 1000000000.00,
    "invoicedTotal": 300000000.00,
    "createdBy": "ketoan01",
    "createdAt": "2026-09-21T10:00:00"
  }
}
```

`invoicedTotal` là tổng đã xuất hóa đơn của hợp đồng **sau khi tính hóa đơn này**; `contractValue -
invoicedTotal` là phần còn có thể lập.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi "Từ chối truy cập" (TC-03). |
| 404 | `RESOURCE_NOT_FOUND` | Không có hợp đồng `{contractId}`, không có mốc `{milestoneId}`, hoặc mốc không thuộc hợp đồng này. |
| 400 | `INVALID_STATE` | Loại hợp đồng không phải `FIXED_PRICE`/`MILESTONE`; mốc còn `PENDING` (chưa nghiệm thu, QTN-25) hoặc đã `INVOICED`. |
| 400 | `VALIDATION_ERROR` | Tổng hóa đơn lũy kế vượt giá trị hợp đồng hoặc hạn mức (TC-02, QTN-19) — `message` yêu cầu lập phụ lục trước; hoặc `dueDate` trước `invoiceDate`; hoặc `note` quá dài. |

**Ghi chú cho Frontend:**
- Với lỗi `VALIDATION_ERROR` do QTN-19, hiển thị đúng `message` backend trả về và gợi ý lối đi tới
  `POST /contracts/{contractId}/appendices` (`NCL-04-CN-004`, vai trò `VT-04`).
- Muốn lập hóa đơn, mốc phải là `READY_TO_INVOICE`: mốc `PENDING` bị chặn (`400 INVALID_STATE`, QTN-25). Đưa mốc sang
  `READY_TO_INVOICE` bằng `PATCH /contracts/{contractId}/milestones/{milestoneId}/status` (`NCL-04-CN-003`); không
  có cách đặt `INVOICED` thủ công — ẩn lựa chọn này khỏi màn hình đổi trạng thái mốc.
- Sau khi lập hóa đơn, mốc đã là `INVOICED`. `PUT /contracts/{contractId}/milestones` **bị từ chối**
  (`400 INVALID_STATE`) khi hợp đồng đã có mốc `INVOICED` — ẩn nút "Khai báo lại mốc" trong trường hợp này.
- Danh sách và chi tiết hóa đơn đọc qua `GET /invoices` và `GET /invoices/{id}` (mục `NCL-10-CN-003` bên dưới).

### `NCL-10-CN-003` — Ghi nhận thanh toán của khách hàng

Yêu cầu token của **Kế toán** (`VT-05`). Kế toán ghi nhận một lần khách hàng trả tiền cho một hóa đơn (số tiền,
ngày, hình thức); hệ thống cập nhật **số đã thu**, **số còn phải thu** và **trạng thái hóa đơn** trong cùng
giao dịch: thu đủ → `PAID`, còn thiếu → `PARTIALLY_PAID`. Số đã thu = tổng các lần thanh toán của hóa đơn (không
lưu cột riêng trên hóa đơn). Các lần ghi thanh toán của cùng một hóa đơn được xếp hàng tuần tự (khoá ghi dòng
hóa đơn) nên hai kế toán ghi cùng lúc không thể cùng làm hóa đơn bị thu thừa.

Chỉ hóa đơn `ISSUED` hoặc `PARTIALLY_PAID` nhận thanh toán. Mỗi lần ghi thành công ghi Nhật ký hệ thống
(`action` = "Ghi nhan thanh toan cua khach hang", `targetType` = `INVOICE`, `targetId` = id hóa đơn); lần bị từ
chối quyền ghi "Từ chối truy cập" — chức năng "Ghi nhận thanh toán của khách hàng" (TC-04).

#### `POST /invoices/{invoiceId}/payments`

**Request:**

```json
{
  "amount": 60000000,
  "paymentDate": "2026-09-20",
  "method": "BANK_TRANSFER",
  "note": "Khach chuyen khoan dot 1"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `amount` | number | có | Lớn hơn `0`, tối đa 2 chữ số thập phân; không được lớn hơn số còn phải thu của hóa đơn (TC-03). |
| `paymentDate` | date | có | Không được ở tương lai (được phép trùng hoặc trước ngày hóa đơn — khách trả trước). |
| `method` | string | có | `BANK_TRANSFER` (chuyển khoản) · `CASH` (tiền mặt) · `OTHER` (khác). |
| `note` | string | không | Tối đa 1000 ký tự. |

**Response thành công — `200 OK`** (TC-02: trả 60 triệu trên hóa đơn 100 triệu):

```json
{
  "success": true,
  "message": "Ghi nhan thanh toan cua khach hang thanh cong",
  "data": {
    "id": 500,
    "invoiceId": 9,
    "invoiceCode": "INV-20260921-A1B2C3",
    "amount": 60000000.00,
    "paymentDate": "2026-09-20",
    "method": "BANK_TRANSFER",
    "note": "Khach chuyen khoan dot 1",
    "totalAmount": 100000000.00,
    "paidAmount": 60000000.00,
    "remainingAmount": 40000000.00,
    "invoiceStatus": "PARTIALLY_PAID",
    "createdBy": "ketoan01",
    "createdAt": "2026-09-21T10:00:00"
  }
}
```

`paidAmount` và `remainingAmount` là số **sau khi tính lần thanh toán này**; `invoiceStatus` là trạng thái mới
của hóa đơn (`PAID` khi `remainingAmount = 0`, TC-01).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi "Từ chối truy cập" (TC-04). |
| 404 | `RESOURCE_NOT_FOUND` | Không tồn tại hóa đơn `{invoiceId}`. |
| 400 | `INVALID_STATE` | Hóa đơn còn nháp (`DRAFT`), đã `PAID` hoặc đã `CANCELLED`. |
| 400 | `VALIDATION_ERROR` | Thiếu/sai `amount`, `paymentDate`, `method`; `amount` ≤ 0; ngày thanh toán ở tương lai; hoặc `amount` lớn hơn số còn phải thu (TC-03). |

**Ghi chú cho Frontend:**
- Hiển thị đúng `message` backend trả về khi `VALIDATION_ERROR` do vượt số còn phải thu.
- Sau khi ghi thành công, dùng `remainingAmount`/`invoiceStatus` trong response để cập nhật màn hình, không cần
  gọi lại API khác.
- Để chọn hóa đơn cần ghi thanh toán, gọi `GET /invoices?status=ISSUED&status=PARTIALLY_PAID` (bên dưới);
  `invoiceId` cũng lấy được từ `data.id` của `POST /contracts/{contractId}/milestones/{milestoneId}/invoice`
  (`NCL-10-CN-002`).

#### `GET /invoices`

Danh sách hóa đơn kèm **số đã thu / còn phải thu**, hóa đơn mới nhất trước. Chỉ `VT-05`. Không phân trang.

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `contractId` | number | không | Chỉ lấy hóa đơn của hợp đồng này. |
| `status` | string, lặp lại được | không | `DRAFT` · `ISSUED` · `PARTIALLY_PAID` · `PAID` · `CANCELLED`. Bỏ trống = mọi trạng thái. Để chọn hóa đơn cần thu tiền dùng `?status=ISSUED&status=PARTIALLY_PAID`. |

**Response thành công — `200 OK`** (danh sách rỗng khi không có hóa đơn nào khớp):

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 9,
      "invoiceCode": "INV-20260921-A1B2C3",
      "contractId": 5,
      "contractCode": "HD-LK3F9A",
      "customerId": 3,
      "customerName": "Cong ty A",
      "status": "PARTIALLY_PAID",
      "totalAmount": 100000000.00,
      "paidAmount": 60000000.00,
      "remainingAmount": 40000000.00,
      "invoiceDate": "2026-09-21",
      "dueDate": "2026-10-21",
      "note": null,
      "createdBy": "ketoan01",
      "createdAt": "2026-09-21T10:00:00"
    }
  ]
}
```

#### `GET /invoices/{invoiceId}`

Một hóa đơn với cùng cấu trúc như phần tử của `GET /invoices`. Chỉ `VT-05`.

#### `GET /invoices/{invoiceId}/payments`

Lịch sử các lần thanh toán của hóa đơn, `paymentDate` mới nhất trước (cùng ngày thì lần ghi sau đứng trước).
Chỉ `VT-05`. Hóa đơn chưa có lần thanh toán nào trả `data: []`.

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 501,
      "amount": 40000000.00,
      "paymentDate": "2026-09-21",
      "method": "CASH",
      "note": null,
      "createdBy": "ketoan01",
      "createdAt": "2026-09-21T10:00:00"
    }
  ]
}
```

**Response lỗi cho cả ba API đọc:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi "Từ chối truy cập" (chức năng "Tra cứu hóa đơn và công nợ" hoặc "Ghi nhận thanh toán của khách hàng"). |
| 404 | `RESOURCE_NOT_FOUND` | (`GET /invoices/{id}` và `.../payments`) không tồn tại hóa đơn `{invoiceId}`. |
| 400 | — | `status` không thuộc danh sách trên (lỗi kiểu tham số của framework). |

### `NCL-10-CN-004` — Theo dõi công nợ quá hạn

Yêu cầu token của **Kế toán** (`VT-05`). Hệ thống liệt kê các hóa đơn **quá hạn thanh toán** tại ngày hôm nay,
phân nhóm theo **số ngày quá hạn** kèm khách hàng và **số tiền còn lại**, để Kế toán nhắc khách hàng kịp thời.
Chỉ đọc — không đổi dữ liệu.

**Hóa đơn nào bị coi là quá hạn:** trạng thái `ISSUED` hoặc `PARTIALLY_PAID`, `dueDate` **trước** hôm nay
và số còn phải thu (`totalAmount − paidAmount`) lớn hơn `0`. Hóa đơn `DRAFT`, `PAID`, `CANCELLED` và hóa đơn chưa
tới hạn (kể cả đúng ngày `dueDate`) không có mặt. Hóa đơn quá hạn từ ngày kế tiếp `dueDate`, nên
`daysOverdue` nhỏ nhất là `1`; ghi nhận thanh toán đủ (`NCL-10-CN-003`) làm hóa đơn tự rời khỏi danh sách.

**Hạn thanh toán (`dueDate`):** lấy từ hóa đơn — do Kế toán nhập khi lập hóa đơn theo mốc
(`NCL-10-CN-002`, trường `dueDate`), mặc định `invoiceDate` + 30 ngày. Hóa đơn lập trước khi có trường này được
điền `invoiceDate` + 30 ngày (migration `V79`).

**Nhóm tuổi nợ** (luôn trả đủ bốn nhóm, theo thứ tự dưới đây):

| `bucket` | `label` | `fromDays` | `toDays` |
|---|---|---|---|
| `DAYS_1_30` | Qua han 1-30 ngay | 1 | 30 |
| `DAYS_31_60` | Qua han 31-60 ngay | 31 | 60 |
| `DAYS_61_90` | Qua han 61-90 ngay | 61 | 90 |
| `OVER_90` | Qua han tren 90 ngay | 91 | `null` |

Hóa đơn quá hạn **trên 30 ngày** nằm ở `DAYS_31_60` trở đi — ví dụ hóa đơn quá hạn 40 ngày nằm ở `DAYS_31_60`
(TC-01). Trong mỗi nhóm, hóa đơn quá hạn lâu nhất đứng trước.

Lần bị từ chối quyền ghi Nhật ký hệ thống "Từ chối truy cập" — chức năng "Theo dõi công nợ quá hạn" (TC-03).
Endpoint chỉ đọc nên chỉ ghi nhật ký lần bị từ chối, không ghi lượt xem thành công (giống `GET /invoices`).

#### `GET /receivables/overdue`

| Query param | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `customerId` | number | không | Chỉ lấy hóa đơn của khách hàng này. |
| `bucket` | string | không | `DAYS_1_30` · `DAYS_31_60` · `DAYS_61_90` · `OVER_90`. Chỉ giữ hóa đơn thuộc nhóm này; `totalInvoiceCount`/`totalRemainingAmount` tính theo bộ lọc, các nhóm còn lại vẫn có mặt nhưng rỗng. |

**Response thành công — `200 OK`** (ví dụ rút gọn: một hóa đơn 100 triệu, đã thu 40 triệu, quá hạn 40 ngày — TC-01):

```json
{
  "success": true,
  "message": null,
  "data": {
    "asOfDate": "2026-09-21",
    "totalInvoiceCount": 1,
    "totalRemainingAmount": 60000000.00,
    "buckets": [
      { "bucket": "DAYS_1_30", "label": "Qua han 1-30 ngay", "fromDays": 1, "toDays": 30,
        "invoiceCount": 0, "remainingAmount": 0.00, "invoices": [] },
      {
        "bucket": "DAYS_31_60", "label": "Qua han 31-60 ngay", "fromDays": 31, "toDays": 60,
        "invoiceCount": 1,
        "remainingAmount": 60000000.00,
        "invoices": [
          {
            "id": 9,
            "invoiceCode": "INV-20260713-A1B2C3",
            "contractId": 5,
            "contractCode": "HD-LK3F9A",
            "customerId": 3,
            "customerName": "Cong ty A",
            "status": "PARTIALLY_PAID",
            "totalAmount": 100000000.00,
            "paidAmount": 40000000.00,
            "remainingAmount": 60000000.00,
            "invoiceDate": "2026-07-13",
            "dueDate": "2026-08-12",
            "daysOverdue": 40
          }
        ]
      },
      { "bucket": "DAYS_61_90", "label": "Qua han 61-90 ngay", "fromDays": 61, "toDays": 90,
        "invoiceCount": 0, "remainingAmount": 0.00, "invoices": [] },
      { "bucket": "OVER_90", "label": "Qua han tren 90 ngay", "fromDays": 91, "toDays": null,
        "invoiceCount": 0, "remainingAmount": 0.00, "invoices": [] }
    ]
  }
}
```

`daysOverdue` = số ngày từ `dueDate` tới `asOfDate` (luôn `>= 1`); `remainingAmount` của nhóm = tổng
`remainingAmount` các hóa đơn trong nhóm; `totalRemainingAmount` = tổng cả bốn nhóm.

**Không có công nợ quá hạn — vẫn `200 OK`** (TC-02): `totalInvoiceCount` = `0`, `totalRemainingAmount` = `0.00`,
bốn nhóm đều `invoiceCount` = `0` và `invoices` = `[]`, và `message` = `"Khong co cong no qua han"`:

```json
{
  "success": true,
  "message": "Khong co cong no qua han",
  "data": { "asOfDate": "2026-09-21", "totalInvoiceCount": 0, "totalRemainingAmount": 0.00, "buckets": [ "..." ] }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 401 | `UNAUTHORIZED` | Chưa gửi hoặc gửi sai token. |
| 403 | `FORBIDDEN` | Không phải Kế toán (`VT-05`); hệ thống ghi "Từ chối truy cập" — chức năng "Theo dõi công nợ quá hạn" (TC-03). |
| 400 | `VALIDATION_ERROR` | `bucket` không thuộc bốn giá trị trên hoặc `customerId` không phải số (lỗi kiểu tham số của framework, không có `fieldErrors`). |

**Ghi chú cho Frontend:**
- Khi `data.totalInvoiceCount = 0` hiển thị `message` ("không có công nợ quá hạn") thay vì bảng trống; bốn nhóm vẫn
  có mặt để dựng sẵn các thẻ tổng hợp bằng `0`.
- Mỗi nhóm dùng `label`, `fromDays`, `toDays` để hiển thị khoảng — không tự suy ngưỡng ở phía Frontend.
- Bấm một hóa đơn mở `GET /invoices/{id}` và `GET /invoices/{id}/payments` (`NCL-10-CN-003`); để thu tiền dùng
  `POST /invoices/{invoiceId}/payments`. Sau khi ghi thanh toán đủ, tải lại danh sách để hóa đơn biến mất.
- `dueDate` cũng có trong `GET /invoices` và `GET /invoices/{id}` (`NCL-10-CN-003`) và trong response lập hóa đơn
  theo mốc (`NCL-10-CN-002`); màn hình lập hóa đơn nên cho nhập `dueDate` (mặc định gợi ý `invoiceDate` + 30 ngày).
- Chưa có nhắc nợ tự động — thuộc `NCL-10-CN-006`.

### `NCL-10-CN-005` — Hóa đơn định kỳ cho hợp đồng duy trì

Toàn bộ endpoint dưới đây chỉ dành cho Kế toán (`VT-05`) — vai trò khác nhận `403 FORBIDDEN` và bị ghi
Nhật ký hệ thống lần từ chối (TC-03). Story này tạo bản ghi trên cùng bảng `invoices` dùng chung của
Epic `NCL-10` (không có cột riêng để phân biệt nguồn phát sinh): hóa đơn định kỳ dùng chung tiền tố mã
`INV-` với hóa đơn theo mốc (`NCL-10-CN-002`) và ghi rõ kỳ trong `note`.

#### `POST /contracts/{contractId}/recurring-invoice-schedule`

Khai báo điều khoản lập hóa đơn định kỳ cho một hợp đồng duy trì. Chỉ hợp đồng loại
`MAINTENANCE` mới khai báo được; mỗi hợp đồng tối đa một điều khoản đang hiệu lực.

**Request:**
```json
{
  "billingDayOfMonth": 5,
  "amount": 10000000,
  "notes": "Phi bao tri hang thang goi Chuan"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `contractId` | number | có | Lấy từ URL. Phải là hợp đồng loại `MAINTENANCE`. |
| `billingDayOfMonth` | number | có | Từ `1` đến `28` (tránh các tháng không có ngày 29-31). |
| `amount` | number | có | Lớn hơn `0`, giá trị hóa đơn mỗi kỳ. |
| `notes` | string | không | Tối đa 500 ký tự. |
| `active` | boolean | không | Mặc định `true` khi tạo mới. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Khai bao dieu khoan lap hoa don dinh ky thanh cong",
  "data": {
    "id": 1,
    "contractId": 1,
    "billingDayOfMonth": 5,
    "amount": 10000000.00,
    "active": true,
    "lastGeneratedPeriod": null,
    "notes": "Phi bao tri hang thang goi Chuan",
    "createdAt": "2026-09-01T08:00:00",
    "updatedAt": null
  }
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `billingDayOfMonth` ngoài khoảng 1-28, hoặc `amount` không dương/để trống. |
| 400 | `INVALID_STATE` | Hợp đồng không phải loại `MAINTENANCE`. |
| 403 | `FORBIDDEN` | Token không có vai trò `VT-05`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy hợp đồng. |
| 409 | `DUPLICATE_DATA` | Hợp đồng đã có điều khoản lập hóa đơn định kỳ. |

Mỗi lần khai báo đều ghi Nhật ký hệ thống (TC-04).

#### `PUT /contracts/{contractId}/recurring-invoice-schedule`

Cập nhật điều khoản đã khai báo (ngày lập, giá trị, ghi chú, bật/tắt qua `active`). Cùng khuôn dạng
request/response với endpoint tạo. Trả `404 RESOURCE_NOT_FOUND` nếu hợp đồng chưa có điều khoản nào.
Ghi Nhật ký hệ thống mỗi lần cập nhật (TC-04).

#### `GET /contracts/{contractId}/recurring-invoice-schedule`

Xem điều khoản lập hóa đơn định kỳ hiện hành của một hợp đồng. Trả `404 RESOURCE_NOT_FOUND` nếu chưa
khai báo.

#### `POST /recurring-invoices/run`

Chạy rà soát toàn bộ điều khoản đang bật (`active = true`): điều khoản nào có `billingDayOfMonth` trùng
ngày rà soát **và** chưa sinh hóa đơn cho kỳ (tháng) đó thì tạo một hóa đơn nháp (`status = "DRAFT"`)
đúng giá trị điều khoản (TC-01). Hệ thống tự chạy hằng ngày lúc 06:00 (giờ server); endpoint này cho phép
Kế toán chạy thủ công hoặc mô phỏng một ngày cụ thể qua `asOf` khi kiểm thử.

**Request** (tùy chọn, có thể gửi body rỗng `{}`):
```json
{
  "asOf": "2026-09-05"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `asOf` | date | không | Định dạng `YYYY-MM-DD`. Để trống = lấy ngày hệ thống hôm nay. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Ra soat lap hoa don dinh ky thanh cong",
  "data": {
    "asOf": "2026-09-05",
    "created": [
      {
        "id": 500,
        "invoiceCode": "INV-20260905-4F2A9C",
        "contractId": 1,
        "customerId": 100,
        "periodStart": "2026-09-01",
        "periodEnd": "2026-09-30",
        "invoiceDate": "2026-09-05",
        "amount": 10000000.00,
        "status": "DRAFT"
      }
    ],
    "skipped": [
      {
        "contractId": 2,
        "reason": "Hợp đồng HD-0002 đã hết hiệu lực (trạng thái ACTIVE, ngày kết thúc 2026-08-31), cần kiểm tra việc gia hạn trước khi lập hóa đơn"
      }
    ]
  }
}
```

Ý nghĩa từng trường hợp trong `skipped` (TC-02 và QTN-19):
- Hợp đồng đã hết hiệu lực tại ngày rà soát (`endDate` đã qua, hoặc trạng thái `TERMINATED`/`COMPLETED`) →
  không tạo hóa đơn, nhắc kiểm tra gia hạn.
- Tổng giá trị đã lập hóa đơn (dùng chung phép kiểm tra với `NCL-10-CN-002`, `ContractValueLimitValidator`)
  cộng thêm hóa đơn kỳ này vượt hạn mức/giá trị hợp đồng → không tạo hóa đơn, nhắc lập phụ lục điều chỉnh
  (QTN-19).

Điều khoản chưa tới ngày lập trong tháng, hoặc đã sinh hóa đơn cho kỳ hiện tại rồi, không xuất hiện ở cả
`created` lẫn `skipped` (không phải trường hợp cần Kế toán xử lý). Hóa đơn tạo ra có `dueDate` mặc định
`invoiceDate + 30 ngày`, cùng quy ước với hóa đơn theo mốc (`Invoice.DEFAULT_PAYMENT_TERM_DAYS`).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Token không có vai trò `VT-05`. |
| 400 | `VALIDATION_ERROR` | `asOf` sai định dạng hoặc không đọc được body. |

Mỗi hóa đơn được tạo đều ghi Nhật ký hệ thống riêng (TC-04), kèm mã hóa đơn và giá trị, **và** gửi
thông báo trong ứng dụng (`type` = `RECURRING_INVOICE_GENERATED`, `referenceType` = `Invoice`,
`referenceId` = id hóa đơn) cho toàn bộ Kế toán (vai trò `VT-05`) — đây là phần "báo cho kế toán" của
TC-01, tách khỏi Nhật ký hệ thống (Nhật ký chỉ tra cứu được, không chủ động báo ai). Đọc qua
`GET /notifications` như các thông báo khác.

### `NCL-10-CN-006` — Nhắc thu nợ tự động

Toàn bộ endpoint dưới đây chỉ dành cho Kế toán (`VT-05`) — vai trò khác nhận `403 FORBIDDEN` và bị ghi
Nhật ký hệ thống lần từ chối (TC-03). Áp dụng cho mọi hóa đơn còn công nợ (`status` là `ISSUED` hoặc
`PARTIALLY_PAID` và còn phải thu `> 0`), theo ba mốc:

- **Trước hạn 3 ngày** (`UPCOMING_3_DAYS`): `dueDate` còn đúng 3 ngày nữa.
- **Đúng hạn** (`DUE_TODAY`): `dueDate` là hôm nay.
- **Sau hạn theo chu kỳ 7 ngày** (`OVERDUE`): số ngày quá hạn là bội số của 7 (7, 14, 21…) — lặp lại
  đều đặn cho tới khi hóa đơn được thanh toán đủ, không giới hạn số lần.

Người nhận mỗi lần nhắc: toàn bộ Kế toán (vai trò `VT-05`) và người phụ trách khách hàng của hóa đơn đó
(`Customer.ownerId`, nhân viên kinh doanh), không trùng lặp.

#### `POST /dunning/run`

Chạy rà soát toàn bộ hóa đơn còn công nợ: hóa đơn nào đang ở đúng một mốc (TC-01) **và** mốc đó
chưa từng được nhắc thì gửi thông báo trong hệ thống cho từng người nhận và ghi một dòng lịch sử nhắc
nợ. Hệ thống tự chạy hằng ngày lúc 07:00 (giờ server, sau giờ chạy hóa đơn định kỳ lúc 06:00); endpoint
này cho phép Kế toán chạy thủ công hoặc mô phỏng một ngày cụ thể qua `asOf` khi kiểm thử.

**Request** (tùy chọn, có thể gửi body rỗng `{}`):
```json
{
  "asOf": "2026-09-21"
}
```

| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `asOf` | date | không | Định dạng `YYYY-MM-DD`. Để trống = lấy ngày hệ thống hôm nay. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": "Ra soat nhac thu no thanh cong",
  "data": {
    "asOf": "2026-09-21",
    "sent": [
      {
        "id": 500,
        "invoiceId": 9,
        "stage": "UPCOMING_3_DAYS",
        "referenceDate": "2026-09-24",
        "daysOverdue": null,
        "remainingAmount": 40000000.00,
        "recipientIds": [1, 2, 3],
        "sentAt": "2026-09-21T07:00:00"
      }
    ],
    "skippedAlreadySentCount": 2
  }
}
```

| Trường | Ghi chú |
|---|---|
| `sent[].stage` | `UPCOMING_3_DAYS`, `DUE_TODAY` hoặc `OVERDUE`. |
| `sent[].referenceDate` | Mốc gắn với lần nhắc: hạn thanh toán (`UPCOMING_3_DAYS`/`DUE_TODAY`) hoặc ngày ứng với mốc 7 ngày quá hạn (`OVERDUE`). |
| `sent[].daysOverdue` | `null` với `UPCOMING_3_DAYS`; `0` với `DUE_TODAY`; bội số của 7 với `OVERDUE`. |
| `skippedAlreadySentCount` | Số hóa đơn đang ở đúng một mốc nhưng mốc đó **đã được nhắc trước đó** (TC-02) — chạy lại trong cùng ngày sẽ không tăng thêm `sent`. |

Hóa đơn chưa tới mốc nào (còn hơn 3 ngày, hoặc quá hạn nhưng chưa đúng bội số 7 ngày) không xuất hiện ở
cả `sent` lẫn không tính vào `skippedAlreadySentCount`.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Token không có vai trò `VT-05`. |
| 400 | `VALIDATION_ERROR` | `asOf` sai định dạng hoặc không đọc được body. |

Có gửi nhắc thì ghi một dòng Nhật ký hệ thống tổng hợp cho cả lượt chạy (TC-04).

#### `GET /invoices/{invoiceId}/dunning-logs`

Lịch sử nhắc thu nợ của một hóa đơn, mới nhất trước.

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 500,
      "invoiceId": 9,
      "stage": "UPCOMING_3_DAYS",
      "referenceDate": "2026-09-24",
      "daysOverdue": null,
      "remainingAmount": 40000000.00,
      "recipientIds": [1, 2, 3],
      "sentAt": "2026-09-21T07:00:00"
    }
  ]
}
```

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Token không có vai trò `VT-05`. |
| 404 | `RESOURCE_NOT_FOUND` | Không tìm thấy hóa đơn `{invoiceId}`. |

---

## Epic `NCL-11` — Báo cáo và bảng điều khiển

### `NCL-11-CN-001` — Bảng điều khiển vận hành

#### `GET /reports/dashboard`

Các chỉ số chính của kỳ chọn cho Ban giám đốc. Chỉ dành cho `VT-01` (QTN-01) — vai trò khác nhận
`403 FORBIDDEN` và bị ghi Nhật ký hệ thống lần từ chối (TC-03). Mỗi lượt xem thành công ghi một dòng
Nhật ký hệ thống ("Xem bảng điều khiển vận hành": người thực hiện, vai trò, kỳ, thời điểm) và một dòng
Nhật ký truy cập dữ liệu nhạy cảm loại `MARGIN` (TC-04).

**Query params** (bắt buộc cả hai, định dạng `YYYY-MM-DD`, gồm cả hai đầu):

| Tham số | Ghi chú |
|---|---|
| `from` | Ngày đầu kỳ. |
| `to` | Ngày cuối kỳ, không được trước `from`. |

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "kpis": {
      "recognizedRevenue": 4000000.00,
      "averageMarginRate": 0.1000,
      "billableHoursRatio": 0.4444,
      "negativeMarginProjectCount": 1,
      "overdueInvoiceCount": 2
    },
    "missingCostEntryCount": 0,
    "missingRevenueEntryCount": 0
  }
}
```

| Trường | Cách tính |
|---|---|
| `recognizedRevenue` | Tổng doanh thu của các dòng giờ công **đã duyệt** (`APPROVED`) có `workDate` trong kỳ và tính phí (`billable`): giờ × đơn giá bán theo hợp đồng ÷ 8 × hệ số loại hình công việc (cùng công thức báo cáo biên `NCL-09-CN-005`). |
| `averageMarginRate` | Phân số, không phải %: (tổng doanh thu − tổng giá vốn nhân công) ÷ tổng doanh thu của kỳ, làm tròn 4 chữ số. `0.1000` = 10%. Gộp có trọng số, không lấy trung bình cộng từng dự án. |
| `billableHoursRatio` | Phân số theo QTN-23: giờ công tính phí đã duyệt trong kỳ (dòng đảo/sửa mang dấu nên cộng thẳng) ÷ tổng **giờ làm việc chuẩn** của mọi nhân sự trong kỳ. Giờ chuẩn của một người = số ngày thứ Hai đến thứ Sáu (trừ ngày lễ) trong phần giao giữa kỳ và `[hireDate, endDate]` × `standardHoursPerWeek` ÷ 5, không kể ngày lễ khai báo ở `/holidays`. Nhân sự vào làm giữa kỳ chỉ tính từ ngày vào làm. `0` khi tổng giờ chuẩn bằng 0. Có thể vượt `1` khi làm thêm giờ. |
| `negativeMarginProjectCount` | Số dự án có (doanh thu − giá vốn nhân công) `< 0` trong kỳ. Dự án chỉ có giờ không tính phí hoặc thiếu đơn giá bán (doanh thu 0) mà có giá vốn cũng bị tính là âm biên. |
| `overdueInvoiceCount` | Số hóa đơn `ISSUED`/`PARTIALLY_PAID` còn phải thu `> 0` có `dueDate` **trước** `min(hôm nay, to)`. Trạng thái và số đã thu là hiện tại, hệ thống không dựng lại lịch sử thanh toán tới cuối kỳ. |
| `missingCostEntryCount` / `missingRevenueEntryCount` | Số dòng giờ công đã duyệt thiếu đơn giá vốn / đơn giá bán. Dòng đó không làm hỏng bảng nhưng khiến doanh thu và biên thấp hơn thực tế — nên hiển thị cảnh báo khi `> 0`. |

Kỳ không có dữ liệu (TC-02) trả `200` với mọi chỉ số bằng `0`, không báo lỗi.

Giới hạn hiện tại: giá vốn chỉ gồm nhân công (chưa gồm chi phí dự án/thuê ngoài); doanh thu tính theo giờ công
nên hợp đồng trọn gói không được quy đổi theo tiến độ hoàn thành. Vì vậy số liệu khớp báo cáo biên
`NCL-09-CN-005` cùng kỳ nhưng có thể khác `GET /projects/{projectId}/profitability` (tính toàn thời gian, đủ các khoản chi phí).

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Token không có vai trò `VT-01`. |
| 400 | `VALIDATION_ERROR` | Thiếu `from`/`to`, sai định dạng ngày, hoặc `from` sau `to`. |

### `NCL-11-CN-002` — Báo cáo tỷ lệ giờ tính phí

#### `GET /reports/utilization`

Tỷ lệ giờ tính phí của kỳ theo **toàn công ty, từng bộ phận và từng người**. Chỉ dành cho `VT-01` — vai trò
khác nhận `403 FORBIDDEN` và bị ghi Nhật ký hệ thống lần từ chối (TC-04). Mỗi lượt xem thành công ghi một dòng
Nhật ký hệ thống "Xem báo cáo tỷ lệ giờ tính phí" (người thực hiện, vai trò, kỳ, thời điểm — TC-05).

**Query params** (bắt buộc cả hai, định dạng `YYYY-MM-DD`, gồm cả hai đầu): `from`, `to` (không được trước `from`).

**Response thành công — `200 OK`:**
```json
{
  "success": true,
  "message": null,
  "data": {
    "from": "2026-02-01",
    "to": "2026-02-28",
    "totalBillableHours": 300.00,
    "totalStandardHours": 640.00,
    "totalRatio": 0.4688,
    "unlistedBillableHours": 24.00,
    "departments": [
      {
        "departmentId": 1,
        "departmentName": "Phong ky thuat",
        "employeeCount": 3,
        "billableHours": 160.00,
        "standardHours": 400.00,
        "ratio": 0.4000
      },
      {
        "departmentId": null,
        "departmentName": "Chưa gán bộ phận",
        "employeeCount": 1,
        "billableHours": 80.00,
        "standardHours": 160.00,
        "ratio": 0.5000
      }
    ],
    "employees": [
      {
        "employeeId": 11,
        "userId": 201,
        "fullName": "Nhan su A",
        "professionalRole": "Ky su phan mem",
        "departmentId": 1,
        "departmentName": "Phong ky thuat",
        "billableHours": 120.00,
        "standardHours": 160.00,
        "ratio": 0.7500
      }
    ]
  }
}
```

| Trường | Cách tính |
|---|---|
| `billableHours` | Tổng giờ công **đã duyệt** (`APPROVED`) và tính phí (`billable`) có `workDate` trong kỳ. Dòng đảo/sửa mang dấu nên cộng thẳng. |
| `standardHours` | Giờ làm việc chuẩn của kỳ (QTN-23): số ngày thứ Hai đến thứ Sáu, không phải ngày lễ, trong phần giao giữa kỳ và `[hireDate, endDate]` của nhân sự × `standardHoursPerWeek` ÷ 5. Người vào làm giữa kỳ chỉ tính từ ngày vào làm (TC-02); người nghỉ việc giữa kỳ chỉ tính đến ngày nghỉ. Ngày lễ lấy từ lịch `/holidays`; người làm vào ngày lễ vẫn có giờ tính phí ở tử số nên tỷ lệ có thể vượt `1`. |
| `ratio` | Phân số, không phải %: `billableHours ÷ standardHours`, làm tròn 4 chữ số (`0.7500` = 75%), không chặn trần nên có thể vượt `1` khi làm thêm giờ. Người đang làm việc trong kỳ nhưng chưa ghi giờ nào có `ratio = 0` và vẫn hiện trong báo cáo (TC-03). `null` khi `standardHours = 0` mà vẫn có giờ tính phí (thường do nhập sai ngày vào/nghỉ việc). |
| `departments` | Chỉ tính nhân sự **trực tiếp** thuộc bộ phận đó, không cộng dồn bộ phận con. `ratio` là tổng giờ tính phí ÷ tổng giờ chuẩn của bộ phận (không phải trung bình cộng các tỷ lệ). Nhân sự chưa gán bộ phận gộp vào một dòng `departmentId = null` xếp cuối, nên tổng các dòng luôn bằng số toàn công ty. Sắp theo tên bộ phận. |
| `employees` | Sắp theo họ tên. Người không làm việc ngày nào trong kỳ và không có giờ tính phí (vào làm sau kỳ, nghỉ trước kỳ) không xuất hiện. |
| `totalBillableHours`, `totalStandardHours`, `totalRatio` | Tổng của mọi người trong `employees`; `totalRatio = null` khi `totalStandardHours = 0`. Bằng `billableHoursRatio` của `GET /reports/dashboard` cùng kỳ khi `unlistedBillableHours = 0`. |
| `unlistedBillableHours` | Giờ tính phí đã duyệt của tài khoản không xuất hiện trong báo cáo (chưa có hồ sơ nhân sự hoặc không làm việc ngày nào trong kỳ). `totalBillableHours + unlistedBillableHours` bằng mọi giờ tính phí đã duyệt của kỳ. |

Giới hạn hiện tại: chưa có dữ liệu nghỉ phép nên người nghỉ phép dài ngày ra `0` giống người chưa ghi giờ nào. Ngày lễ chỉ có hiệu lực khi
Nhân sự đã khai báo ở `/holidays`; chưa khai báo thì mọi ngày thứ Hai đến thứ Sáu đều tính là ngày làm việc.

**Response lỗi:**

| HTTP | `errorCode` | Khi nào xảy ra |
|---|---|---|
| 403 | `FORBIDDEN` | Token không có vai trò `VT-01`. |
| 400 | `VALIDATION_ERROR` | Thiếu `from`/`to`, sai định dạng ngày, hoặc `from` sau `to`. |

---

## Ghi chú tích hợp Frontend — Epic `NCL-05` (Dự án và công việc)


Tổng hợp cho đội Frontend khi dựng các màn hình Epic `NCL-05`. Không thay đổi hợp đồng API — chỉ gom
những điểm hay gây lỗi tích hợp.

### Bản đồ endpoint theo Story

| Story | Method & path | Vai trò |
|---|---|---|
| CN-001 tạo dự án | `POST /contracts/{contractId}/projects` | `VT-02` |
| CN-001 đọc dự án | `GET /projects/{projectId}` · `GET /contracts/{contractId}/projects` | `VT-01/02/03` |
| CN-002 cây công việc | `POST /projects/{id}/work-packages` · `POST …/work-packages/{wpId}/tasks` · `GET /projects/{id}/work-breakdown` · `DELETE …/work-packages/{wpId}` | ghi: `VT-02`; đọc cây: `VT-01/02/03` |
| CN-003 giao việc | `PUT /projects/{id}/tasks/{taskId}/assignments` · `GET …/assignments` | ghi: `VT-02`; đọc: `VT-01/02/03` |
| CN-004 tiến độ | `PATCH /projects/{id}/tasks/{taskId}/progress` | `VT-03` **và** là người được giao |
| CN-005 ngân sách giờ | `PUT /projects/{id}/tasks/{taskId}/budget` | `VT-02` |
| CN-006 đóng dự án | `POST /projects/{id}/close` | `VT-02` |
| CN-007 tạo từ mẫu | `GET /contracts/{contractId}/projects/from-template` · `POST …/from-template` | `VT-02` |
| CN-008 mốc tiến độ | `GET/POST /projects/{id}/milestones` · `PUT …/{mId}` · `POST …/{mId}/complete` · `DELETE …/{mId}` | `VT-02` |
| CN-009 rủi ro | `GET/POST /projects/{id}/risks` · `PUT …/{rId}` · `PUT …/{rId}/status` · `DELETE …/{rId}` | `VT-02` |

### Tập giá trị enum (khớp backend)

| Enum | Giá trị | Dùng ở |
|---|---|---|
| `ProjectStatus` | `RUNNING` · `CLOSED` | `ProjectRes.status` |
| `TaskStatus` | `TODO` · `IN_PROGRESS` · `WAITING_APPROVAL` · `DONE` | công việc, mốc |
| `MilestoneProgressStatus` (chỉ đọc, backend tự tính) | `ON_TRACK` · `LATE` · `DONE` | `ProjectMilestoneRes.status` |
| `RiskLevel` | `LOW` · `MEDIUM` · `HIGH` | rủi ro: `impact`, `likelihood`, `severity` |
| `RiskStatus` | `OPEN` · `MITIGATING` · `CLOSED` | `ProjectRiskRes.status` |
| `projectType` (kế thừa từ loại hợp đồng `ContractType`, kiểu chuỗi) | `TIME_AND_MATERIAL` · `FIXED_PRICE` · `MAINTENANCE` · `MILESTONE` | `ProjectRes.projectType` |

### Khoá thao tác khi dự án đã đóng

Khi `ProjectStatus = CLOSED`, backend **tự chặn** mọi endpoint ghi của CN-002…CN-005, CN-008, CN-009
bằng `400 INVALID_STATE`. Frontend nên gọi `GET /projects/{projectId}` một lần khi vào màn hình dự án và
ẩn/vô hiệu hoá toàn bộ nút tạo/sửa/xoá nếu `status === "CLOSED"` để người dùng không bấm rồi mới nhận lỗi.

### Các điểm hay gây lỗi

- **`daysLate` / `score` / `severity` là read-only** — backend tính động mỗi lần đọc, đừng gửi lên khi tạo/sửa.
- **CN-004 `403` không phải lỗi vai trò**: một `VT-03` hợp lệ vẫn bị từ chối nếu không nằm trong danh sách
  người được giao — hiển thị thông báo riêng "Bạn không phải người phụ trách công việc này".
- **CN-003 / CN-008 `PUT` là thay thế toàn bộ**: danh sách `userIds` (giao việc) và `taskIds` (hạng mục của
  mốc) ghi đè hoàn toàn danh sách cũ, không phải thêm dồn.
- **`usageRatio` (CN-005) là phân số** `0.0`–`1.0+`, nhân `100` khi hiển thị; `overBudgetWarning` bật khi `≥ 0.80`.
- **Watcher của rủi ro** phải là `userId` của tài khoản đang `ACTIVE`; backend trả kèm `watcherName` để hiển thị.
- Mọi thao tác ghi của Epic đều đã tự ghi `project_audit_logs` — Frontend không cần gọi thêm API lịch sử.
