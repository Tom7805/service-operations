# Danh sách mã lỗi (`errorCode`)

Áp dụng cho mọi API — khi request thất bại, backend luôn trả `errorCode` nằm trong danh sách dưới đây
(định nghĩa tại `backend/src/main/java/com/serviceops/common/exception/ErrorCode.java`). Frontend nên switch
theo `errorCode`, không nên switch theo `message` (vì `message` có thể đổi nội dung diễn giải mà không báo trước).

| `errorCode` | HTTP status | Ý nghĩa | Đang dùng ở |
|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Sai tài khoản hoặc mật khẩu khi đăng nhập | `NCL-01-CN-001` |
| `ACCOUNT_LOCKED` | 401 | Tài khoản đang tạm khóa (tự động, do nhập sai quá số lần cho phép) | `NCL-01-CN-001` |
| `ACCOUNT_INACTIVE` | 401 | Tài khoản bị quản trị viên khóa thủ công | `NCL-01-CN-001` |
| `DUPLICATE_DATA` | 409 | Dữ liệu bị trùng (ví dụ tên tài khoản đã tồn tại, tài khoản đã có hồ sơ nhân sự, đã có bản ghi giờ công trên cùng công việc trong cùng ngày, hoặc hợp đồng đã có điều khoản lập hóa đơn định kỳ) | `NCL-01-CN-002`, `NCL-01-CN-007` (kể cả `POST /holidays` với ngày đã là ngày lễ), `NCL-06-CN-001`, `NCL-10-CN-005` |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ — xem thêm mảng `fieldErrors` trong response khi lỗi đến từ body `@Valid`; API chỉ dùng `@RequestParam` (vd `GET /me/time-entries`) trả cùng `errorCode` nhưng không có `fieldErrors`, chỉ có `message` mô tả tham số bị thiếu/sai định dạng | Toàn bộ API có `@Valid` hoặc `@RequestParam` bắt buộc; `NCL-10-CN-001` khi thiếu hoặc sai khoảng ngày (`periodFrom`/`periodTo`, ngày sai định dạng hoặc `periodFrom` sau `periodTo`); `NCL-10-CN-002` khi tổng hóa đơn lũy kế vượt giá trị hợp đồng/hạn mức (QTN-19) hoặc `dueDate` trước `invoiceDate`; `NCL-10-CN-003` khi số tiền thanh toán vượt số còn phải thu hoặc ngày thanh toán ở tương lai; `NCL-10-CN-004` khi `bucket` không thuộc danh sách nhóm hoặc `customerId` sai kiểu; `NCL-10-CN-005` khi `billingDayOfMonth` ngoài khoảng 1-28 hoặc `amount` không dương/để trống (lỗi này chỉ chặn lúc khai báo/cập nhật điều khoản — lúc chạy rà soát `POST /recurring-invoices/run`, hợp đồng vượt giá trị theo QTN-19 chỉ bị BỎ QUA kèm lý do, không làm hỏng cả lượt chạy), hoặc `asOf` sai định dạng khi gọi `POST /recurring-invoices/run`/`POST /dunning/run` (`NCL-10-CN-006`); `NCL-11-CN-001`, `NCL-11-CN-002`, `NCL-11-CN-004` khi thiếu hoặc sai khoảng ngày (`from`/`to`, ngày sai định dạng hoặc `from` sau `to`); `NCL-11-CN-005` khi thiếu hoặc sai `fromMonth`/`toMonth` (`yyyy-MM`), `fromMonth` sau `toMonth` hoặc kỳ dài hơn 36 tháng; `NCL-11-CN-004` còn khi thiếu `reportType` hoặc `reportType`/`format` không thuộc danh sách |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy bản ghi hoặc vai trò (hoặc dữ liệu kế hoạch cần thiết chưa tồn tại — ví dụ dự án chưa gắn báo giá nào ở `NCL-09-CN-006`, hoặc hợp đồng chưa khai báo điều khoản lập hóa đơn định kỳ ở `NCL-10-CN-005`) | `NCL-01-CN-002` và các API tra cứu theo id, ví dụ `NCL-03-CN-006`, `NCL-06-CN-001`, `NCL-06-CN-003`, `NCL-09-CN-006`, `NCL-10-CN-001`, `NCL-10-CN-002`, `NCL-10-CN-003`, `NCL-10-CN-005`, `NCL-10-CN-006` (`GET /invoices/{invoiceId}/dunning-logs` với hóa đơn không tồn tại) |
| `INVALID_STATE` | 400 | Thao tác chuyển trạng thái không hợp lệ, hoặc vi phạm ràng buộc nghiệp vụ (ví dụ ngày kết thúc sớm hơn ngày bắt đầu, thêm hoạt động chăm sóc vào cơ hội đã đóng, ghi giờ công cho dự án đã đóng/ngày ở tương lai, nộp bảng chấm công khi có ngày vượt 12 giờ, duyệt bảng chấm công sai trạng thái, hoặc khai báo điều khoản lập hóa đơn định kỳ cho hợp đồng không phải loại MAINTENANCE) | `NCL-01-CN-002`, `NCL-01-CN-003`, `NCL-01-CN-007`, `NCL-03-CN-006`, `NCL-06-CN-001`, `NCL-06-CN-002`, `NCL-06-CN-003`, `NCL-10-CN-001` (hợp đồng không phải theo giờ, hoặc kỳ không có dòng giờ công/chi phí nào đủ điều kiện), `NCL-10-CN-002` (mốc chưa đủ điều kiện/đã xuất hóa đơn, loại hợp đồng không phù hợp), `NCL-10-CN-003` (hóa đơn nháp/đã thanh toán đủ/đã huỷ không nhận thanh toán), `NCL-10-CN-005` (hợp đồng không phải loại MAINTENANCE), `NCL-11-CN-004` (kỳ đã chọn không có số liệu để xuất) |
| `FORBIDDEN` | 403 | Có tài khoản hợp lệ nhưng không đủ quyền truy cập dữ liệu/chức năng | Các story áp dụng `QTN-01` (phân quyền theo vai trò và cây tổ chức) và `QTN-03` — ví dụ `NCL-01-CN-002`, `NCL-01-CN-006`, `NCL-02-CN-003`, `NCL-03-CN-006`, `NCL-06-CN-001`, `NCL-09-CN-005`, `NCL-09-CN-006`, `NCL-10-CN-001`, `NCL-10-CN-002`, `NCL-10-CN-003`, `NCL-10-CN-004`, `NCL-10-CN-005`, `NCL-10-CN-006`, `NCL-11-CN-001`, `NCL-11-CN-002`, `NCL-11-CN-004`, `NCL-11-CN-005` |
| `RESET_TOKEN_INVALID` | 400 | Liên kết khôi phục mật khẩu không tồn tại, đã hết hạn, hoặc đã được dùng | `NCL-01-CN-008` |
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
