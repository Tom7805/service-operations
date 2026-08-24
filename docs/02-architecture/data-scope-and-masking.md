# Che dữ liệu lương và giá vốn (`NCL-01-CN-005`)

Ghi lại cách cơ chế che dữ liệu nhạy cảm hoạt động, để các module sau này (đơn giá/giá vốn `NCL-07`, biên lợi
nhuận `NCL-09`, báo cáo `NCL-11`...) áp dụng đúng mà không phải đọc lại code của story này.

## Mục tiêu

Chi phí giờ công nội bộ và giá vốn dự án là dữ liệu nhạy cảm nhất trong hệ thống — chỉ **Nhân sự (`VT-06`)**,
**Kế toán (`VT-05`)** và **Ban giám đốc (`VT-01`)** được xem giá trị thật (`QTN-02`). Vai trò khác (đặc biệt là
Quản lý dự án `VT-02`) vẫn cần thấy các trường khác của cùng bản ghi (ví dụ doanh thu), chỉ riêng cột nhạy cảm bị
che.

## Thành phần

| Lớp | File | Vai trò |
|---|---|---|
| Annotation | `common/masking/MaskSensitive.java` | Gắn lên field DTO cần che, kèm `MaskingLevel` (`SALARY` hoặc `COST`). |
| Enum | `common/masking/MaskingLevel.java` | Phân loại dữ liệu nhạy cảm (hiện tại 2 loại đều dùng chung một tập vai trò được phép xem — xem `DataMaskingServiceImpl`). |
| Serializer | `common/masking/MaskingJsonSerializer.java` | Chạy tự động mỗi khi Jackson serialize một field có `@MaskSensitive`; trả `"***"` nếu vai trò hiện tại không đủ quyền. Ghi log `SENSITIVE_DATA_ACCESS`. |
| Service | `common/masking/DataMaskingService.java` + `DataMaskingServiceImpl.java` | Dùng khi cần che dữ liệu ngoài luồng JSON tự động (ví dụ khi build file Excel/PDF ở `NCL-11-CN-004`): gọi `mask(value)`. |
| Controller | `common/masking/MaskingRuleController.java` | `GET /masking-rules` — màn hình "Cấu hình quy tắc che dữ liệu" (TC-04), chỉ Nhân sự/Kế toán/Ban giám đốc được mở. |

## Cách dùng cho DTO mới

```java
public record ProjectMarginRow(
    BigDecimal revenue,
    @MaskSensitive(MaskingLevel.COST) BigDecimal laborCost
) {}
```

Không cần thêm code gì khác — field `laborCost` sẽ tự động bị che khi serialize sang JSON cho vai trò không đủ
quyền, kể cả khi nằm trong `List<ProjectMarginRow>` hoặc lồng trong object khác.

## Vì sao không sửa trực tiếp `Employee`/`CostRate`/`LaborCost`

Các entity chứa dữ liệu lương/giá vốn thật (`Employee` — `NCL-01-CN-007`, `CostRate`/`LaborCostEntry` — `NCL-07`,
`NCL-09`) chưa được triển khai tại thời điểm story này chạy — các file liên quan trong `modules/rate` và
`modules/profitability` mới là skeleton rỗng. Cơ chế che dữ liệu được xây dựng độc lập với các entity đó (áp
dụng qua annotation trên field, không phụ thuộc entity cụ thể), vì vậy khi các story kia triển khai, chỉ cần gắn
`@MaskSensitive` lên đúng field là tự động có hiệu lực — không cần sửa lại package `common/masking`.

## Ghi nhật ký truy cập

Mỗi lần một field `@MaskSensitive` được đọc (JSON) hoặc `DataMaskingService.mask()` được gọi trực tiếp, hệ thống
ghi một dòng log `SENSITIVE_DATA_ACCESS` (người dùng, tên field, có bị che hay không). Đây là log ứng dụng
(SLF4J), phục vụ TC-05 của story này. Việc lưu các dòng log này vào bảng tra cứu được (để làm màn hình "Nhật ký
truy cập dữ liệu nhạy cảm") thuộc phạm vi `NCL-01-CN-006` — package `common/audit` đã có sẵn khung sườn rỗng cho
story đó.

Mỗi lần một request bị `@PreAuthorize` từ chối (mã lỗi `FORBIDDEN`, HTTP 403) ở **bất kỳ** endpoint nào trong hệ
thống — không riêng gì `/masking-rules` — `GlobalExceptionHandler` cũng ghi một dòng log `ACCESS_DENIED` (người
dùng, method, đường dẫn), đáp ứng chung quy tắc `QTN-01` cho mọi story có tiêu chí "Không có quyền → ghi nhật ký
lần từ chối".

## Giới hạn hiện tại

- `GET /masking-rules` chỉ **xem** quy tắc hiện hành (tập vai trò được phép đang cố định trong code, theo đúng
  mô tả nghiệp vụ của story — không có yêu cầu cho phép chỉnh sửa động). Nếu sau này có yêu cầu cho phép quản trị
  viên tùy biến tập vai trò, cần bổ sung bảng cấu hình và endpoint `PUT`.
- TC-01 (báo cáo hiệu quả dự án hiện doanh thu, che giá vốn) và TC-02 (tệp xuất không có cột bị che) chỉ kiểm
  chứng được đầy đủ khi có API báo cáo/dự án thật; hiện đã kiểm chứng ở mức cơ chế bằng test
  `DataMaskingServiceTest` (field đơn, field lồng trong danh sách).
