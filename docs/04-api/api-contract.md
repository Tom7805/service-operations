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
- Tài khoản mẫu để test: `admin` / `Password@123` (vai trò Quản trị viên, phạm vi toàn công ty).

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
    { "level": "SALARY", "levelLabel": "Luong / chi phi gio cong noi bo", "allowedRoles": ["VT-01", "VT-05", "VT-06"] },
    { "level": "COST", "levelLabel": "Gia von", "allowedRoles": ["VT-01", "VT-05", "VT-06"] }
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
