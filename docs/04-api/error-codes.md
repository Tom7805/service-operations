# Danh sách mã lỗi (`errorCode`)

Áp dụng cho mọi API — khi request thất bại, backend luôn trả `errorCode` nằm trong danh sách dưới đây
(định nghĩa tại `backend/src/main/java/com/serviceops/common/exception/ErrorCode.java`). Frontend nên switch
theo `errorCode`, không nên switch theo `message` (vì `message` có thể đổi nội dung diễn giải mà không báo trước).

| `errorCode` | HTTP status | Ý nghĩa | Đang dùng ở |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Sai tài khoản hoặc mật khẩu khi đăng nhập | `NCL-01-CN-001` |
| `ACCOUNT_LOCKED` | 401 | Tài khoản đang tạm khóa (tự động, do nhập sai quá số lần cho phép) | `NCL-01-CN-001` |
| `ACCOUNT_INACTIVE` | 401 | Tài khoản bị quản trị viên khóa thủ công | `NCL-01-CN-001` |
| `DUPLICATE_DATA` | 409 | Dữ liệu bị trùng (ví dụ tên tài khoản đã tồn tại, hoặc tài khoản đã có hồ sơ nhân sự) | `NCL-01-CN-002`, `NCL-01-CN-007` |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ — xem thêm mảng `fieldErrors` trong response | Toàn bộ API có `@Valid` |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy bản ghi hoặc vai trò | `NCL-01-CN-002` và các API tra cứu theo id |
| `INVALID_STATE` | 400 | Thao tác chuyển trạng thái không hợp lệ, hoặc vi phạm ràng buộc nghiệp vụ (ví dụ ngày kết thúc sớm hơn ngày bắt đầu) | `NCL-01-CN-002`, `NCL-01-CN-003`, `NCL-01-CN-007` |
| `FORBIDDEN` | 403 | Có tài khoản hợp lệ nhưng không đủ quyền truy cập dữ liệu/chức năng | Các story áp dụng `QTN-01` (phân quyền theo vai trò và cây tổ chức) và `QTN-03` — ví dụ `NCL-01-CN-002`, `NCL-01-CN-006` |
| `INTERNAL_ERROR` | 500 | Lỗi hệ thống không lường trước — không phải lỗi do dữ liệu người dùng nhập | Toàn hệ thống |
| `UNAUTHORIZED` | 401 | Gọi API cần đăng nhập nhưng chưa gửi hoặc gửi sai `Authorization: Bearer <token>` | Toàn hệ thống (áp dụng tự động bởi tầng bảo mật, không gắn với story cụ thể) |

## Khuôn dạng response lỗi đầy đủ

```json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Du lieu khong hop le",
  "timestamp": "2026-08-20T16:44:42.4065497",
  "fieldErrors": [
    { "field": "username", "message": "Ten tai khoan khong duoc de trong" }
  ]
}
```

`fieldErrors` chỉ có giá trị (khác `null`) khi `errorCode` là `VALIDATION_ERROR`.
