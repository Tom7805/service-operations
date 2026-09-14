# `NCL-03-CN-006-CV-01` — Phân tích nghiệp vụ: Ghi nhận hoạt động chăm sóc cơ hội

> Task này là bước `BE-BA` của user story [`NCL-03-CN-006`](../De_tai_1_Van_Hanh_Dich_Vu_Backlog_v2.md)
> — *"Là nhân viên kinh doanh, tôi muốn ghi lại các lần gặp và gọi khách hàng, để đồng nghiệp tiếp
> nhận không phải bắt đầu lại từ đầu."*
> Đầu ra của tài liệu này được bàn giao trực tiếp cho `NCL-03-CN-006-CV-03` (xử lý phía máy chủ) —
> xem hiện thực tại `backend/src/main/java/com/serviceops/modules/opportunity/service/impl/OpportunityActivityServiceImpl.java`.

## 1. Phạm vi

Một hoạt động chăm sóc (activity) là một lần tiếp xúc với khách hàng — gọi điện, gặp mặt, gửi thư
điện tử hoặc ghi chú khác — gắn với **một cơ hội bán hàng cụ thể**. Nhiều hoạt động của cùng một cơ
hội tạo thành **dòng thời gian chăm sóc** của cơ hội đó, giúp người tiếp nhận sau (đồng nghiệp, quản
lý) nắm được lịch sử trao đổi mà không phải hỏi lại người trước.

Story này triển khai **trên nền** cơ hội bán hàng đã có sẵn từ `NCL-03-CN-001` (tạo cơ hội, bảng
`opportunities` tạo ở `V35`), `NCL-03-CN-002` (chuyển giai đoạn, `status` chuyển `OPEN` → `CLOSED` khi
đạt `WON`/`LOST`) và cơ chế nhật ký cơ hội dùng chung `OpportunityAuditLogger`/`opportunity_audit_logs`
(tạo ở `V36`, dùng chung từ `NCL-03-CN-001`). Phần việc riêng của story này chỉ có: bảng
`opportunity_activities` (migration `V40`), enum `ActivityType`, giá trị `ACTIVITY_ADD` bổ sung vào
`OpportunityAuditAction`, và luồng nghiệp vụ ghi nhận hoạt động dưới đây.

## 2. Luồng thành công (TC-01)

1. Nhân viên kinh doanh mở một cơ hội đang ở trạng thái còn mở (`status = OPEN`).
2. Chọn "Thêm hoạt động chăm sóc", nhập:
   - **Loại hình**: gọi điện (`CALL`), gặp mặt (`MEETING`), thư điện tử (`EMAIL`) hoặc ghi chú khác
     (`NOTE`).
   - **Thời điểm** hoạt động diễn ra (`occurredAt`) — khác với thời điểm ghi nhận vào hệ thống
     (`createdAt`), vì người dùng có thể nhập bù một cuộc gọi đã thực hiện trước đó.
   - **Người tham gia** (tuỳ chọn) — dạng văn bản tự do, ví dụ "sale01, chị Lan (khách hàng)".
   - **Nội dung trao đổi** (bắt buộc) — tóm tắt những gì đã trao đổi.
3. Máy chủ kiểm tra cơ hội tồn tại và đang mở (mục 3), lưu hoạt động, ghi người thực hiện
   (`createdBy`) và thời điểm ghi nhận (`createdAt`).
4. Máy chủ gọi `OpportunityAuditLogger.recordActivityAdd(...)` để ghi một dòng vào nhật ký cơ hội
   dùng chung (`opportunity_audit_logs`, hành động `ACTIVITY_ADD`) — người thực hiện, nội dung, thời
   điểm (TC-04).
5. Hoạt động vừa thêm xuất hiện ngay ở đầu dòng thời gian (`GET .../activities`, sắp theo
   `occurredAt` giảm dần).

## 3. Trường hợp ngoại lệ (khớp `NCL-03-CN-006-TC-02`, `TC-03`, `TC-04`)

| # | Điều kiện | Xử lý |
|---|---|---|
| 1 | Cơ hội không tồn tại (`opportunityId` sai) | Từ chối, HTTP 404 `RESOURCE_NOT_FOUND` |
| 2 | **Cơ hội đã đóng** (`status = CLOSED`, tức đã đạt `WON` hoặc `LOST` — xem `NCL-03-CN-002`/`005`) và người dùng thêm hoạt động mới (`TC-02`) | Từ chối, HTTP 400 `INVALID_STATE` — thông điệp nêu rõ "chỉ có thể xem lại lịch sử, không thể thêm hoạt động mới". **Xem (`GET`) vẫn luôn được phép** dù cơ hội đã đóng — chỉ chặn riêng thao tác thêm mới. |
| 3 | Người dùng không thuộc vai trò Nhân viên kinh doanh (`VT-04`) mở chức năng này (`TC-03`) | Từ chối, HTTP 403 `FORBIDDEN` — áp dụng cho **cả** xem dòng thời gian lẫn thêm hoạt động, cùng phân quyền với `NCL-03-CN-001`/`002`/`005`. Vì controller nằm trong `com.serviceops.modules.opportunity.controller`, lần từ chối được tự động bắt và ghi lại bởi `OpportunityAccessDeniedAspect` (aspect dùng chung của cả module, đã có từ `NCL-03-CN-001`) — không cần code thêm gì ở story này. |
| 4 | Thiếu loại hoạt động, thiếu thời điểm, hoặc nội dung trao đổi để trống | Từ chối, HTTP 400 `VALIDATION_ERROR` kèm `fieldErrors` |
| 5 | Có thao tác thêm hoạt động thành công (`TC-04`) | Ghi nhật ký: người thực hiện, hành động `ACTIVITY_ADD`, thời điểm — bảng `opportunity_audit_logs` (qua `OpportunityAuditLogger`) |

## 4. Quy tắc nghiệp vụ áp dụng

Story gốc không gắn với `QTN-xx` cụ thể nào trong backlog (cột *Quy tắc liên quan* để trống), nên
quy tắc "cơ hội đã đóng thì không thêm được hoạt động mới" (mục 3, dòng #2) là quy tắc trạng thái tối
thiểu suy ra trực tiếp từ *Điều kiện bắt đầu* (`"Cơ hội đang ở trạng thái còn mở"`) và `TC-02` của
chính story này — không phải một `QTN` dùng chung với story khác. Quy tắc chuyển `OPEN` → `CLOSED` bản
thân nó do `NCL-03-CN-002`/`005` (`QTN-06`) định nghĩa; story này chỉ **đọc** `status` để quyết định có
cho thêm hoạt động hay không.

## 5. Điều kiện bắt đầu / Kết quả sau hoàn thành (viết lại dạng kiểm chứng được)

| | Ghi nhận hoạt động chăm sóc |
|---|---|
| **Điều kiện bắt đầu** | `opportunityId` tồn tại trong bảng `opportunities` và `status = 'OPEN'` |
| **Kết quả sau hoàn thành** | Có thêm một dòng trong `opportunity_activities` gắn đúng `opportunity_id`, đủ `activity_type`/`occurred_at`/`content`/`created_by`/`created_at`; có thêm một dòng `opportunity_audit_logs` với `action_type = 'ACTIVITY_ADD'`; `GET .../activities` trả về dòng vừa thêm ở đầu danh sách |

## 6. Endpoint bàn giao cho CV-03 / CV-02 (FE-UI)

| Phương thức | Đường dẫn | Vai trò yêu cầu | Ghi chú |
|---|---|---|---|
| `GET` | `/api/v1/opportunities/{opportunityId}/activities` | `VT-04` | Dòng thời gian chăm sóc, mới nhất lên đầu — luôn xem được kể cả khi cơ hội đã đóng |
| `POST` | `/api/v1/opportunities/{opportunityId}/activities` | `VT-04` | Body: `{ activityType, occurredAt, participants?, content }` — chỉ thành công khi cơ hội đang mở (`status = OPEN`) |

Chi tiết request/response đầy đủ: xem [api-contract.md § NCL-03-CN-006](../../04-api/api-contract.md).
Cơ hội mẫu để thử ngay: id `2001`/`2002` (seed `R__seed_sample_opportunities.sql`), hoặc tạo mới qua
`POST /opportunities` (`NCL-03-CN-001`).

## 7. Ngoài phạm vi task này

- Tạo mới cơ hội bán hàng, chuyển giai đoạn, lập báo giá, dự báo doanh thu, ghi nhận thắng/thua
  (`NCL-03-CN-001` đến `005`) — **đã triển khai từ trước**, story này chỉ tiêu thụ kết quả của chúng
  (bảng `opportunities`, `OpportunityStatus`, `OpportunityAuditLogger`).
- Báo cáo đường ống bán hàng theo giai đoạn (`NCL-03-CN-007`).
- Phạm vi dữ liệu theo cây tổ chức (`QTN-01`) cho riêng module cơ hội — hiện chỉ chặn theo vai trò
  (`VT-04`), giống đúng mức độ mà `NCL-03-CN-001`/`002`/`005` đã làm; lọc theo phòng ban/người phụ
  trách cơ hội (`ownerId`, đã có sẵn trên `Opportunity`) chưa được áp dụng ở tầng truy vấn của story
  này.
