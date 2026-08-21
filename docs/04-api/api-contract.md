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
