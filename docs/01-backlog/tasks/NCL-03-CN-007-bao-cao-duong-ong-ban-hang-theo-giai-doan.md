# `NCL-03-CN-007-CV-01` — Phân tích nghiệp vụ: Báo cáo đường ống bán hàng theo giai đoạn

> Task này là bước `BE-BA` của user story [`NCL-03-CN-007`](../De_tai_1_Van_Hanh_Dich_Vu_Backlog_v2.md)
> — *"Là ban giám đốc, tôi muốn xem số lượng và giá trị cơ hội ở từng giai đoạn, để biết đường ống có
> đủ dày hay không."*
> Đầu ra của tài liệu này được bàn giao trực tiếp cho `NCL-03-CN-007-CV-03` (xử lý phía máy chủ) —
> xem hiện thực tại
> `backend/src/main/java/com/serviceops/modules/opportunity/service/impl/SalesPipelineReportServiceImpl.java`
> và endpoint tại `.../controller/SalesPipelineController.java`.
> Hợp đồng request/response đầy đủ cho `FE-UI`/`FE-DEV`: xem
> [api-contract.md § NCL-03-CN-007](../../04-api/api-contract.md).

## 1. Phạm vi

Báo cáo đường ống bán hàng là **một ảnh chụp hiện tại** của toàn bộ cơ hội trong hệ thống, gom theo
`stage` (giai đoạn). Với mỗi giai đoạn báo cáo hiển thị:

- **số lượng** cơ hội đang ở giai đoạn đó (`opportunityCount`),
- **tổng giá trị dự kiến** (`totalExpectedValue` = tổng `expectedValue`),
- **số ngày trung bình** mỗi cơ hội đã nằm ở giai đoạn đó (`averageDaysInStage`),
- **cảnh báo đọng lâu** — số cơ hội còn mở đã nằm quá lâu bất thường ở giai đoạn (`stalledCount`,
  `stalledOpportunityIds`).

Story triển khai **trên nền** hạ tầng cơ hội đã có: bảng `opportunities` (`V35`, `NCL-03-CN-001`),
`opportunity_stage_history` (`V37`, `NCL-03-CN-002`), nhật ký cơ hội dùng chung `OpportunityAuditLogger`
/ `opportunity_audit_logs` (`V36`) và `OpportunityAccessDeniedAspect` (aspect chung của module). Phần
việc riêng của story này **không có migration DB** (`BE-DB` không nằm trong story) — chỉ thêm:

- giá trị `REPORT_VIEW` vào enum `OpportunityAuditAction` (cột `action_type` đã là `VARCHAR(30)`),
- một phương thức truy vấn `OpportunityStageHistoryRepository.findAllByOrderByChangedAtDesc()`,
- DTO `PipelineReportRes` / `PipelineStageRes`,
- service `SalesPipelineReportService` + impl, controller `SalesPipelineController`.

## 2. Luồng thành công (TC-01)

1. Ban giám đốc (`VT-01`) hoặc Nhân viên kinh doanh (`VT-04`) gọi `GET /opportunities/pipeline-report`.
2. Máy chủ đọc **toàn bộ** cơ hội (`opportunityRepository.findAll()`) và **toàn bộ** lịch sử chuyển
   giai đoạn một lần (`findAllByOrderByChangedAtDesc()`, gom theo `opportunityId` trong bộ nhớ — tránh
   N+1).
3. Với mỗi cơ hội, tính **số ngày ở giai đoạn hiện tại**:
   - mốc bắt đầu = `changedAt` của bản ghi lịch sử **mới nhất** có `toStage` = `stage` hiện tại của cơ
     hội;
   - nếu cơ hội chưa từng chuyển giai đoạn (không có bản ghi phù hợp) → dùng `createdAt`;
   - `daysInStage = max(0, số ngày từ mốc đó tới generatedAt)`.
4. Cộng dồn theo giai đoạn: `count`, `sum(expectedValue)` (null → 0), `sum(daysInStage)`.
5. Với mỗi giai đoạn xuất **một dòng** `PipelineStageRes`, kể cả giai đoạn không có cơ hội (các số về
   `0`, `stalledOpportunityIds = []`). `averageDaysInStage = round(sum(daysInStage) / count)`, hoặc `0`
   khi `count = 0`. Thứ tự dòng luôn theo enum: `APPROACH → PROPOSAL → NEGOTIATION → WON → LOST`.
6. Trả về tổng hợp cấp báo cáo: `totalOpportunityCount`, `totalExpectedValue`, `stalledThresholdDays`
   (= 60), `generatedAt`.
7. Ghi một dòng `REPORT_VIEW` vào `opportunity_audit_logs` (mục 4).

**Test data TC-01**: 10–12 cơ hội mô phỏng trải trên các giai đoạn — xem seed bổ sung ở
`R__seed_sample_opportunities.sql` (id `2003`–`2012`). Kỳ vọng: mỗi giai đoạn có `opportunityCount` và
`totalExpectedValue` đúng bằng dữ liệu mô phỏng.

## 3. Trường hợp cơ hội "đọng lâu bất thường" (TC-02)

Một cơ hội bị đánh dấu đọng lâu khi **đồng thời**:

| # | Điều kiện | Ý nghĩa |
|---|---|---|
| 1 | `status = OPEN` | Chỉ cơ hội còn trong đường ống mới có nghĩa "đọng". Cơ hội đã đóng (`WON`/`LOST`) **không bao giờ** bị đánh dấu. |
| 2 | `stage ∈ {APPROACH, PROPOSAL, NEGOTIATION}` | Giai đoạn trung gian. `WON`/`LOST` bị loại theo điều kiện 1 nhưng vẫn kiểm tra tường minh. |
| 3 | `daysInStage > 60` (`STALLED_THRESHOLD_DAYS`) | Đã nằm ở giai đoạn hiện tại **quá** 60 ngày (so theo mốc "chuyển vào giai đoạn hiện tại" ở mục 2 bước 3 — chính là *"ngày chuyển giai đoạn gần nhất"* nêu trong cột **Dữ liệu kiểm thử** của `TC-02`). |

Khi thỏa: `id` cơ hội được thêm vào `stalledOpportunityIds` của dòng giai đoạn tương ứng, và
`stalledCount` = kích thước danh sách đó. Ngưỡng `60` được trả về trong `stalledThresholdDays` để giao
diện hiển thị.

**Test data TC-02**: cơ hội `2007` (`NEGOTIATION`, `OPEN`, `created_at` cách hiện tại > 60 ngày, chưa
có bản ghi lịch sử) → xuất hiện trong `stages[2].stalledOpportunityIds`.

## 4. Ghi nhật ký (TC-04)

| Điều kiện áp dụng | Kết quả |
|---|---|
| Mỗi lần `generate()` chạy thành công | Ghi một dòng `opportunity_audit_logs`: `action_type = REPORT_VIEW`, `opportunity_id = NULL` (báo cáo không gắn một cơ hội cụ thể), `actor_id`/`actor_username` = người gọi, `detail` = `"Xem bao cao duong ong ban hang: <N> co hoi, <M> co hoi dong lau bat thuong (nguong 60 ngay)"`, `created_at` = thời điểm sinh báo cáo. |

Vì phương thức có ghi dữ liệu nên `SalesPipelineReportServiceImpl.generate()` chạy trong transaction
**đọc-ghi** (`@Transactional`, không `readOnly`) — dòng nhật ký nằm cùng transaction với truy vấn báo
cáo. Nếu ghi nhật ký lỗi thì cả request lỗi (đúng tinh thần *"không cho hoàn tất thao tác nếu không ghi
được nhật ký"* của Definition of Done). `OpportunityAuditLogger.record(...)` được làm chắc thêm:
`actor_id` null (ví dụ ngữ cảnh test không có principal) được ghi thành `0` để không vi phạm ràng buộc
`NOT NULL`, giống `logDeniedAccess`.

## 5. Phân quyền & lần từ chối (TC-03)

| Điều kiện | Kết quả |
|---|---|
| Người gọi có vai trò `VT-01` (Ban giám đốc) hoặc `VT-04` (Nhân viên kinh doanh) | Cho xem báo cáo |
| Vai trò khác | `403 FORBIDDEN` — `@PreAuthorize("hasAnyRole('VT-01', 'VT-04')")` trên `SalesPipelineController.pipelineReport()` chặn trước khi vào method; vì controller nằm trong `com.serviceops.modules.opportunity.controller`, `OpportunityAccessDeniedAspect` tự bắt `AccessDeniedException`, ghi `DENIED_ACCESS` vào `opportunity_audit_logs` rồi ném tiếp để `GlobalExceptionHandler` trả `403` (không cần code thêm ở story này) |
| Chưa đăng nhập | `401 UNAUTHORIZED` |

Cùng đúng mức phân quyền mà `NCL-03-CN-004` (dự báo doanh thu) đã làm: chỉ chặn theo **vai trò**, chưa
lọc theo cây tổ chức / người phụ trách (`ownerId`) — xem mục 7.

## 6. Quy tắc nghiệp vụ áp dụng

Cột *Quy tắc liên quan* của story ghi `QTN-07` (*Dự báo doanh thu theo xác suất giai đoạn*). Báo cáo
đường ống dùng **chung khái niệm "giai đoạn của cơ hội còn mở"** với `QTN-07`/`NCL-03-CN-004`: cơ hội
`status = OPEN` là phần "đường ống" đang chạy, `WON`/`LOST` là kết quả đã chốt. Khác biệt: báo cáo này
**không nhân xác suất** và **không giới hạn theo `expectedCloseDate`** — nó đếm/cộng nguyên giá trị và
liệt kê **cả 5 giai đoạn** (kể cả `WON`/`LOST`) để giao diện vẽ được phễu đầy đủ và thấy tỷ lệ chuyển
đổi. Quy tắc "60 ngày = đọng lâu" là ngưỡng trạng thái tối thiểu suy ra trực tiếp từ `TC-02` của chính
story này (*"quá sáu mươi ngày"*), không phải một `QTN` dùng chung.

## 7. Điều kiện bắt đầu / Kết quả sau hoàn thành (viết lại dạng kiểm chứng được)

| | Báo cáo đường ống bán hàng theo giai đoạn |
|---|---|
| **Điều kiện bắt đầu** | Có ≥ 1 cơ hội trong bảng `opportunities` ở nhiều giai đoạn khác nhau (không bắt buộc — báo cáo trên tập rỗng trả về 5 dòng với các số `0`) |
| **Kết quả sau hoàn thành** | `GET /opportunities/pipeline-report` trả về `PipelineReportRes` với đúng `opportunityCount`, `totalExpectedValue`, `averageDaysInStage` và danh sách `stalledOpportunityIds` cho từng giai đoạn; có thêm một dòng `opportunity_audit_logs` với `action_type = 'REPORT_VIEW'` |

## 8. Endpoint bàn giao cho CV-03 / CV-02 (FE-UI)

| Phương thức | Đường dẫn | Vai trò yêu cầu | Ghi chú |
|---|---|---|---|
| `GET` | `/api/v1/opportunities/pipeline-report` | `VT-01` hoặc `VT-04` | Không tham số. Trả về `PipelineReportRes` (5 dòng giai đoạn cố định thứ tự). Mỗi lần gọi ghi một dòng nhật ký `REPORT_VIEW`. |

Chi tiết request/response đầy đủ + ví dụ JSON: xem
[api-contract.md § NCL-03-CN-007](../../04-api/api-contract.md). Dữ liệu mẫu để thử ngay: seed
`R__seed_sample_opportunities.sql` (cơ hội `2001`–`2012`, trong đó `2007` là cơ hội đọng lâu để kiểm
chứng `TC-02`).

## 9. Kiểm thử phía máy chủ (khớp Definition of Done `BE-API`)

Story này **không có task `BE-QA` riêng** (không có `BE-DB`/`BE-SEC`/`BE-INT`) — kiểm thử tổng thể nằm ở
`FE-QA`. Tuy vậy, theo Definition of Done của `BE-API`, phần máy chủ được phủ bằng:

| Lớp test | Tập tin | Phủ tiêu chí |
|---|---|---|
| Unit (service) | `SalesPipelineReportServiceTest` | TC-01 (đếm/cộng/trung bình theo giai đoạn, giai đoạn trống về 0), TC-02 (đánh dấu đọng lâu > 60 ngày; cơ hội mới / đã đóng không bị đánh dấu; mốc tính từ lần chuyển vào giai đoạn hiện tại), TC-04 (mỗi lần sinh báo cáo ghi một dòng nhật ký) |
| HTTP slice (`@WebMvcTest`) | `SalesPipelineControllerIT` | TC-01 (`VT-01` và `VT-04` xem được, cấu trúc response), TC-02 (các ô `stalledCount`/`stalledOpportunityIds` có trong response), TC-03 (`403 FORBIDDEN` cho vai trò khác; `401` khi chưa đăng nhập) |

Tất cả tiêu chí mức **Cao** đều đạt; chạy `./mvnw -o test` — 233/233 xanh.

## 10. Ngoài phạm vi task này

- Lọc báo cáo theo khoảng ngày (`from`/`to` trên `expectedCloseDate`) — báo cáo hiện là ảnh chụp hiện
  tại, giống bản chất "đường ống" của story.
- Phạm vi dữ liệu theo cây tổ chức / theo `ownerId` (`QTN-01`) — hiện chỉ chặn theo vai trò (`VT-01`,
  `VT-04`), đúng mức mà `NCL-03-CN-001`/`002`/`004`/`005`/`006` đã làm.
- Xuất báo cáo ra tệp (`NCL-11-CN-004`), biểu đồ phễu phía giao diện (`FE-UI`/`FE-DEV`).
- Thay đổi lược đồ CSDL — story không có bước `BE-DB`; `REPORT_VIEW` chỉ là giá trị enum mới trên cột
  `VARCHAR(30)` sẵn có.
