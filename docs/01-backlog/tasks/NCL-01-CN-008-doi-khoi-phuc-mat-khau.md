# `NCL-01-CN-008-CV-01` — Phân tích nghiệp vụ: Đổi và khôi phục mật khẩu

> Task này là bước `BE-BA` của user story [`NCL-01-CN-008`](../De_tai_1_Van_Hanh_Dich_Vu_Backlog_v2.md)
> — *"Là nhân viên công ty, tôi muốn tự đổi hoặc khôi phục mật khẩu, để không phải nhờ quản trị viên mỗi lần quên."*
> Đầu ra của tài liệu này được bàn giao trực tiếp cho `NCL-01-CN-008-CV-03` (xử lý phía máy chủ) —
> xem hiện thực tại `backend/src/main/java/com/serviceops/modules/identity/auth/service/PasswordServiceImpl.java`.

## 1. Phạm vi

Hai luồng nghiệp vụ độc lập nhưng dùng chung một quy tắc mật khẩu hợp lệ:

| Luồng | Ai dùng | Cần đăng nhập? |
|---|---|---|
| **Đổi mật khẩu** (change password) | Người dùng đang đăng nhập, biết mật khẩu cũ | Có |
| **Khôi phục mật khẩu** (forgot/reset password) | Người dùng quên mật khẩu, không đăng nhập được | Không |

## 2. Luồng thành công

### 2.1. Đổi mật khẩu (TC-01)

1. Người dùng đang đăng nhập mở màn hình đổi mật khẩu.
2. Nhập mật khẩu hiện tại + mật khẩu mới.
3. Máy chủ kiểm tra mật khẩu hiện tại đúng với hash đang lưu.
4. Máy chủ kiểm tra mật khẩu mới hợp lệ theo chính sách (mục 4) và khác mật khẩu hiện tại.
5. Máy chủ băm mật khẩu mới, lưu lại, **tăng `tokenVersion`** của tài khoản.
6. Mọi access token (JWT) đã phát hành trước đó — tức các phiên đăng nhập trên thiết bị/trình
   duyệt khác — mang `tokenVersion` cũ nên bị từ chối ở lần gọi API kế tiếp. Đây là cách hiện
   thực "chấm dứt các phiên đăng nhập khác" khi hệ thống chưa có kho lưu phiên tập trung.
7. Ghi nhật ký (`AuditLog`): người thực hiện, hành động `CHANGE_PASSWORD`, thời điểm.

### 2.2. Khôi phục mật khẩu (quên mật khẩu)

1. Người dùng nhập email trên form "Quên mật khẩu".
2. Máy chủ tìm tài khoản theo email:
   - **Nếu có**: sinh một mã khôi phục ngẫu nhiên (256-bit, không đoán được), lưu kèm hạn dùng
     (mặc định 30 phút, cấu hình qua `app.password-reset.token-ttl-minutes`), rồi "gửi" liên kết
     khôi phục qua **thư điện tử mô phỏng** (đúng mô tả của story và QTN-04 — hệ thống chỉ chạy
     trên dữ liệu mô phỏng). Ghi nhật ký `FORGOT_PASSWORD_REQUEST`.
   - **Nếu không có**: không tạo token, không báo lỗi riêng cho trường hợp này.
3. API `forgot-password` luôn trả về cùng một thông điệp thành công dù email có tồn tại hay
   không — **quyết định bảo mật cố ý**: tránh để kẻ tấn công dò ra danh sách email hợp lệ trong
   hệ thống bằng cách thử lần lượt (user enumeration).
4. Người dùng bấm vào liên kết khôi phục → giao diện gọi API kiểm tra hiệu lực token trước khi
   hiển thị form đặt mật khẩu mới (`GET /auth/reset-password/validate`).
5. Người dùng nhập mật khẩu mới → máy chủ xác thực lại token còn hiệu lực, kiểm tra mật khẩu mới
   hợp lệ, cập nhật hash, **tăng `tokenVersion`** (chấm dứt phiên cũ như luồng đổi mật khẩu), đánh
   dấu token đã dùng (`usedAt`), ghi nhật ký `RESET_PASSWORD`.

## 3. Trường hợp ngoại lệ (khớp `NCL-01-CN-008-TC-02`, `TC-03`)

| # | Điều kiện | Xử lý |
|---|---|---|
| 1 | Mật khẩu hiện tại nhập sai khi đổi mật khẩu | Từ chối, HTTP 401, không tăng `tokenVersion`, không lộ hash |
| 2 | Mật khẩu mới không đạt chính sách (mục 4) | Từ chối, HTTP 400, thông báo cụ thể quy tắc bị vi phạm |
| 3 | Mật khẩu mới trùng mật khẩu hiện tại | Từ chối, HTTP 400 — tránh người dùng "đổi cho có" |
| 4 | **Liên kết khôi phục đã quá hạn dùng** (`TC-02`) | Từ chối, HTTP 410 Gone, thông điệp "đường dẫn hết hạn, mời gửi yêu cầu mới" — không cho đặt lại mật khẩu |
| 5 | Liên kết khôi phục đã được dùng một lần trước đó | Coi như hết hạn (dùng chung nhánh xử lý với #4) — chống dùng lại (replay) |
| 6 | Token khôi phục không tồn tại / bị sửa tay | Coi như hết hạn (không tiết lộ token đúng có tồn tại hay không) |
| 7 | Email trong yêu cầu quên mật khẩu không tồn tại | Trả về **cùng** thông điệp thành công như khi email tồn tại (mục 2.2 bước 3) |
| 8 | Có thao tác đổi hoặc khôi phục mật khẩu (thành công) | Ghi nhật ký: người thực hiện, hành động, thời điểm (`TC-03`) — bảng `audit_logs` |

## 4. Quy tắc "mật khẩu mới hợp lệ" (dùng chung cho cả hai luồng)

Story gốc không gắn với một `QTN-xx` cụ thể nào (cột *Quy tắc liên quan* để trống), nên nhóm
BA chốt một chính sách tối thiểu, áp dụng thống nhất bởi `PasswordPolicyValidator` để hai luồng
đổi/khôi phục không lệch luật với nhau:

- Tối thiểu **8 ký tự**.
- Có **ít nhất một chữ cái** và **ít nhất một chữ số**.
- (Mở rộng sau nếu cần: ký tự đặc biệt bắt buộc, chặn mật khẩu nằm trong danh sách rò rỉ phổ biến —
  chưa đưa vào phạm vi tối thiểu này.)

## 5. Điều kiện bắt đầu / Kết quả sau hoàn thành (viết lại dạng kiểm chứng được)

| | Đổi mật khẩu | Khôi phục mật khẩu |
|---|---|---|
| **Điều kiện bắt đầu** | Người dùng đã đăng nhập (JWT còn hiệu lực, `tokenVersion` khớp) | Người dùng có tài khoản `ACTIVE` gắn với email nhập vào |
| **Kết quả sau hoàn thành** | `users.password_hash` cập nhật; `users.token_version` tăng 1; JWT cũ trả về 401 ở lần gọi kế tiếp; có bản ghi `audit_logs.action = CHANGE_PASSWORD` | `users.password_hash` cập nhật; `password_reset_tokens.used_at` khác null; JWT cũ (nếu có) trả về 401; có bản ghi `audit_logs.action = RESET_PASSWORD` |

## 6. Endpoint bàn giao cho CV-03 / CV-02 (FE-UI)

| Phương thức | Đường dẫn | Yêu cầu đăng nhập | Ghi chú |
|---|---|---|---|
| `POST` | `/api/v1/auth/change-password` | Có | Body: `{ currentPassword, newPassword }` |
| `POST` | `/api/v1/auth/forgot-password` | Không | Body: `{ email }` — luôn trả 200 |
| `GET` | `/api/v1/auth/reset-password/validate?token=...` | Không | Trả `{ data: true/false }` để FE quyết định hiển thị form hay thông báo hết hạn |
| `POST` | `/api/v1/auth/reset-password` | Không | Body: `{ token, newPassword }` |

## 7. Ngoài phạm vi task này

- Khóa tài khoản tạm thời sau nhiều lần đăng nhập sai (`NCL-01-CN-001`).
- Xác thực hai bước cho tài khoản xem dữ liệu tài chính (`NCL-01-CN-009`).
- Gửi email thật qua `NotificationService` thay vì ghi log mô phỏng (`NCL-14` khi module
  notification được hoàn thiện) — điểm thay thế đã đánh dấu `// Hệ thống chỉ chạy trên dữ liệu
  mô phỏng...` trong `PasswordServiceImpl.forgotPassword`.
- Gắn vai trò/phạm vi dữ liệu theo cây tổ chức lên `User` (`NCL-01-CN-004`).
