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

Story này **không** bao gồm việc tạo mới cơ hội (`NCL-03-CN-001`) hay chuyển giai đoạn cơ hội
(`NCL-03-CN-002`) — những phần đó nằm ngoài phạm vi và sẽ được bổ sung vào bảng `opportunities` bằng
migration riêng khi triển khai (đã ghi chú trong `V3__create_opportunity_quote_tables.sql`). Phạm vi
tối thiểu bảng `opportunities` được tạo trước tại đây chỉ đủ để story này chạy được: định danh cơ
hội, khách hàng gắn với, và trạng thái mở/đóng.

## 2. Luồng thành công (TC-01)

1. Nhân viên kinh doanh mở một cơ hội đang ở trạng thái còn mở (`OPEN`).
2. Chọn "Thêm hoạt động chăm sóc", nhập:
   - **Loại hình**: gọi điện (`CALL`), gặp mặt (`MEETING`), thư điện tử (`EMAIL`) hoặc ghi chú khác
     (`NOTE`).
   - **Thời điểm** hoạt động diễn ra (`occurredAt`) — khác với thời điểm ghi nhận vào hệ thống
     (`createdAt`), vì người dùng có thể nhập bù một cuộc gọi đã thực hiện trước đó.
   - **Người tham gia** (tuỳ chọn) — dạng văn bản tự do, ví dụ "sale01, chị Lan (khách hàng)".
   - **Nội dung trao đổi** (bắt buộc) — tóm tắt những gì đã trao đổi.
3. Máy chủ kiểm tra cơ hội tồn tại và đang mở (mục 3), lưu hoạt động, ghi người thực hiện
   (`createdBy`) và thời điểm ghi nhận (`createdAt`).
4. Máy chủ ghi một dòng vào nhật ký cơ hội (`opportunity_audit_logs`, hành động `ACTIVITY_ADD`) —
   người thực hiện, nội dung, thời điểm (TC-04).
5. Hoạt động vừa thêm xuất hiện ngay ở đầu dòng thời gian (`GET .../activities`, sắp theo
   `occurredAt` giảm dần).

## 3. Trường hợp ngoại lệ (khớp `NCL-03-CN-006-TC-02`, `TC-03`, `TC-04`)

| # | Điều kiện | Xử lý |
|---|---|---|
| 1 | Cơ hội không tồn tại (`opportunityId` sai) | Từ chối, HTTP 404 `RESOURCE_NOT_FOUND` |
| 2 | **Cơ hội đã đóng** (`status` khác `OPEN`, tức đã `WON` hoặc `LOST`) và người dùng thêm hoạt động mới (`TC-02`) | Từ chối, HTTP 400 `INVALID_STATE` — thông điệp nêu rõ "chỉ có thể xem lại lịch sử, không thể thêm hoạt động mới". **Xem (`GET`) vẫn luôn được phép** dù cơ hội đã đóng — chỉ chặn riêng thao tác thêm mới. |
| 3 | Người dùng không thuộc vai trò Nhân viên kinh doanh (`VT-04`) mở chức năng này (`TC-03`) | Từ chối, HTTP 403 `FORBIDDEN` — áp dụng cho **cả** xem dòng thời gian lẫn thêm hoạt động (giống quy ước `NCL-02-CN-003`: nhóm API chỉ dành riêng cho `VT-04`, kể cả Quản lý dự án cũng không được vào); hệ thống tự ghi nhật ký lần từ chối (`GlobalExceptionHandler`, mức log `WARN`, không cần bảng riêng). |
| 4 | Thiếu loại hoạt động, thiếu thời điểm, hoặc nội dung trao đổi để trống | Từ chối, HTTP 400 `VALIDATION_ERROR` kèm `fieldErrors` |
| 5 | Có thao tác thêm hoạt động thành công (`TC-04`) | Ghi nhật ký: người thực hiện, hành động `ACTIVITY_ADD`, thời điểm — bảng `opportunity_audit_logs` |

## 4. Quy tắc nghiệp vụ áp dụng

Story gốc không gắn với `QTN-xx` cụ thể nào trong backlog (cột *Quy tắc liên quan* để trống), nên
quy tắc "cơ hội đã đóng thì không thêm được hoạt động mới" (mục 3, dòng #2) là quy tắc trạng thái tối
thiểu suy ra trực tiếp từ *Điều kiện bắt đầu* (`"Cơ hội đang ở trạng thái còn mở"`) và `TC-02` của
chính story này — không phải một `QTN` dùng chung với story khác.

## 5. Điều kiện bắt đầu / Kết quả sau hoàn thành (viết lại dạng kiểm chứng được)

| | Ghi nhận hoạt động chăm sóc |
|---|---|
| **Điều kiện bắt đầu** | `opportunityId` tồn tại trong bảng `opportunities` và `status = 'OPEN'` |
| **Kết quả sau hoàn thành** | Có thêm một dòng trong `opportunity_activities` gắn đúng `opportunity_id`, đủ `activity_type`/`occurred_at`/`content`/`created_by`/`created_at`; có thêm một dòng `opportunity_audit_logs` với `action_type = 'ACTIVITY_ADD'`; `GET .../activities` trả về dòng vừa thêm ở đầu danh sách |

## 6. Endpoint bàn giao cho CV-03 / CV-02 (FE-UI)

| Phương thức | Đường dẫn | Vai trò yêu cầu | Ghi chú |
|---|---|---|---|
| `GET` | `/api/v1/opportunities/{opportunityId}/activities` | `VT-04` | Dòng thời gian chăm sóc, mới nhất lên đầu — luôn xem được kể cả khi cơ hội đã đóng |
| `POST` | `/api/v1/opportunities/{opportunityId}/activities` | `VT-04` | Body: `{ activityType, occurredAt, participants?, content }` — chỉ thành công khi cơ hội đang mở |

Chi tiết request/response đầy đủ: xem [api-contract.md § NCL-03-CN-006](../../04-api/api-contract.md).

## 7. Ngoài phạm vi task này

- Tạo mới cơ hội bán hàng, kiểm tra giá trị dự kiến âm (`NCL-03-CN-001`) — bảng `opportunities` mới
  chỉ có `customerId`, `name`, `status`; các trường còn lại (giá trị dự kiến, ngày dự kiến ký, người
  phụ trách) do story đó bổ sung bằng `ALTER TABLE` riêng.
- Chuyển giai đoạn cơ hội theo thứ tự tiếp cận → khảo sát → báo giá → đàm phán (`NCL-03-CN-002`,
  `QTN-06`) — cột `stage` **chưa tồn tại** ở migration này, cố ý để trống vì story này không dùng đến.
- Lập báo giá (`NCL-03-CN-003`), dự báo doanh thu theo xác suất giai đoạn (`NCL-03-CN-004`), ghi
  nhận kết quả thắng/thua (`NCL-03-CN-005`), báo cáo đường ống bán hàng (`NCL-03-CN-007`).
- Phạm vi dữ liệu theo cây tổ chức (`QTN-01`) cho riêng module cơ hội — hiện chỉ chặn theo vai trò
  (`VT-04`), giống đúng mức độ mà `NCL-02-CN-003` (người liên hệ khách hàng) đã làm; lọc theo phòng
  ban/người phụ trách cơ hội sẽ bổ sung khi `NCL-03-CN-001` có trường người phụ trách.
