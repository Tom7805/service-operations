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
  Cây tổ chức: Ban Giám Đốc [1] › {PMO [2], Kinh Doanh [3], Kế Toán [4], Nhân Sự [5], Trung Tâm Công Nghệ [6]};
  Trung Tâm Công Nghệ [6] › {Nhóm Phát Triển [7], Nhóm Tư Vấn [8], Nhóm Kiểm Thử [9]}.

  | username | Vai trò | Phòng | Phạm vi dữ liệu | Ghi chú |
  |---|---|---|---|---|
  | `admin` | `VT-07` Quản trị viên | Trung Tâm Công Nghệ | COMPANY | Tài khoản hệ thống, không có hồ sơ nhân sự |
  | `giamdoc` | `VT-01` Ban giám đốc | Ban Giám Đốc | COMPANY | |
  | `pm.lead` | `VT-02` Quản lý dự án | PMO | DEPARTMENT → PMO | Trưởng phòng |
  | `pm01` | `VT-02` Quản lý dự án | PMO | SELF | |
  | `sale.lead` | `VT-04` Kinh doanh | Kinh Doanh | DEPARTMENT → Kinh Doanh | Trưởng phòng |
  | `sale01` | `VT-04` Kinh doanh | Kinh Doanh | SELF | |
  | `ketoan.lead` / `ketoan01` | `VT-05` Kế toán | Kế Toán | COMPANY | |
  | `nhansu` / `hr01` | `VT-06` Nhân sự | Nhân Sự | COMPANY | |
  | `tcn.director` | `VT-02` Quản lý dự án | Trung Tâm Công Nghệ | DEPARTMENT → Trung Tâm Công Nghệ (gồm cả 3 nhóm con) | |
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

**`SMTP_HOST` là công tắc quyết định kênh gửi** (`PasswordResetNotifier`), không phải profile và cũng
không phải địa chỉ email của tài khoản:

| `SMTP_HOST` | Profile | Kết quả |
|---|---|---|
| rỗng | `dev` / `test` | Ghi liên kết ra logger riêng `AUDIT_MOCK_EMAIL`, **không** gửi thư |
| rỗng | `prod` | Ứng dụng **dừng khởi động** kèm thông báo nói rõ thiếu biến nào |
| có giá trị | bất kỳ | Gửi thư thật qua SMTP. **Không bao giờ** ghi token ra log, kể cả khi gửi thất bại |

Nhờ vậy có thể thử chức năng gửi thư ngay trên máy phát triển (ví dụ trỏ `SMTP_HOST` vào một máy chủ
thư cục bộ như MailHog) mà không phải dựng nguyên cấu hình production.

Ở `prod`, thiếu `SMTP_HOST` thì dừng khởi động là **chủ đích**: nếu để lên bình thường, ứng dụng sẽ im
lặng không gửi được thư trong khi giao diện vẫn báo "đã gửi" — người dùng bị khoá ngoài mà không ai biết.
Cần đủ: `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `FRONTEND_BASE_URL`.

**Token lưu trong CSDL dưới dạng SHA-256** (cột `password_reset_tokens.token_hash`), không phải chuỗi thô.
Đọc được bảng này cũng không đặt lại được mật khẩu của ai.

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
