Title: FE: NCL-05-CN-008 — Quản lý mốc tiến độ của dự án

Summary
- Xây dựng bảng theo dõi tiến độ dự án (`ProjectMilestoneTimeline.tsx`), gắn trực tiếp vào `ProjectDetailPage.tsx` ngay dưới khối cây công việc (WBS) — mỗi mốc hiển thị tên, mô tả, ngày kế hoạch, ngày thực tế, danh sách hạng mục (công việc) phải hoàn thành và trạng thái tiến độ tính động (`DONE` / `ON_TRACK` / `LATE` kèm số ngày trễ), khớp 100% `ProjectMilestoneRes` từ backend.
- Bổ sung modal tạo/sửa mốc tiến độ (`MilestoneFormModal.tsx`): chọn hạng mục phải hoàn thành bằng danh sách chọn nhiều (tái dùng UI `roles-checklist`/`checklist-item` đã có sẵn), làm phẳng cây công việc (WBS) thành danh sách công việc kèm đường dẫn hạng mục cha để dễ nhận biết.
- Bổ sung modal ghi nhận ngày thực tế hoàn thành mốc (`MilestoneCompleteModal.tsx`), chặn ngày ở tương lai ngay từ phía client trước khi gọi API (khớp `INVALID_STATE` của backend).
- Bổ sung API client tại `projectsApi.ts`: `getMilestones`, `createMilestone`, `updateMilestone`, `completeMilestone`, `deleteMilestone` — gọi đúng 5 endpoint `GET/POST/PUT/DELETE /projects/{projectId}/milestones[/{milestoneId}[/complete]]` của `ProjectMilestoneController`.
- Bổ sung kiểu dữ liệu tại `projectTypes.ts`: `MilestoneProgressStatus`, `ProjectMilestoneItemRes`, `ProjectMilestoneRes`, `ProjectMilestoneReq`, `ProjectMilestoneCompleteReq` — khớp từng trường với DTO backend (`ProjectMilestoneRes`, `ProjectMilestoneReq`, `ProjectMilestoneCompleteReq`).
- Bổ sung validator client-side tại `projectValidators.ts`: `validateMilestoneForm` (tên không rỗng ≤255 ký tự, ngày kế hoạch bắt buộc, phải chọn ≥1 hạng mục) và `validateMilestoneCompleteForm` (ngày thực tế bắt buộc, không được ở tương lai).
- Kiểm soát phân quyền và trạng thái dự án ở giao diện (TC-03): nút "+ Thêm mốc tiến độ" và các thao tác Sửa/Hoàn thành/Xóa trên từng dòng chỉ hiện với Quản lý dự án (`VT-02`, `canEdit`) và khi dự án đang `RUNNING`; ẩn hoàn toàn với vai trò khác — khớp `@PreAuthorize("hasRole('VT-02')")` trên toàn bộ `ProjectMilestoneController`.
- Chặn tạo mốc khi dự án chưa có công việc nào trong cây công việc (khớp rule backend `requireWorkBreakdown` → `400 INVALID_STATE`): nút thêm bị vô hiệu hóa kèm chú thích, và modal hiển thị hướng dẫn thay vì để người dùng gặp lỗi từ server.

Files changed
- `frontend/src/modules/projects/types/projectTypes.ts` (thêm `MilestoneProgressStatus`, `ProjectMilestoneItemRes`, `ProjectMilestoneRes`, `ProjectMilestoneReq`, `ProjectMilestoneCompleteReq`, import `TaskStatus` từ `taskTypes`)
- `frontend/src/modules/projects/api/projectsApi.ts` (thêm `getMilestones`, `createMilestone`, `updateMilestone`, `completeMilestone`, `deleteMilestone`)
- `frontend/src/modules/projects/validators/projectValidators.ts` (thêm `validateMilestoneForm`, `validateMilestoneCompleteForm`)
- `frontend/src/modules/projects/validators/__tests__/projectValidators.test.ts` (bổ sung 8 unit tests cho 2 validator mới)
- `frontend/src/modules/projects/components/ProjectMilestoneTimeline.tsx` (mới — trước đây là file rỗng để trống chỗ; triển khai đầy đủ bảng theo dõi tiến độ)
- `frontend/src/modules/projects/components/MilestoneFormModal.tsx` (mới — modal tạo/sửa mốc kèm chọn hạng mục)
- `frontend/src/modules/projects/components/MilestoneCompleteModal.tsx` (mới — modal ghi nhận ngày thực tế)
- `frontend/src/modules/projects/__tests__/ProjectMilestoneTimeline.test.tsx` (mới, 11 unit tests bao phủ TC-01 → TC-03)
- `frontend/src/modules/projects/pages/ProjectDetailPage.tsx` (gắn `<ProjectMilestoneTimeline />` dưới khối WBS, tái dùng `canEdit`/`isProjectOpen`/`showToast` đã có)
- `frontend/src/modules/projects/__tests__/ProjectDetailPage.test.tsx` (cập nhật mock `projectsApi` để thêm 5 hàm milestone mới, mặc định `getMilestones` trả `[]` trong `beforeEach` — không đổi hành vi test cũ)

Acceptance criteria mapping
- NCL-05-CN-008-TC-01: Quản lý dự án (VT-02) tạo mốc tiến độ với tên, ngày kế hoạch và ≥1 hạng mục (công việc) phải hoàn thành; hệ thống từ chối khi thiếu trường bắt buộc hoặc dự án chưa có cây công việc.
- NCL-05-CN-008-TC-02: Bảng theo dõi tiến độ tự tính trạng thái tại thời điểm xem — `DONE` khi đã có ngày thực tế, `LATE` kèm số ngày trễ khi quá hạn kế hoạch mà chưa hoàn thành, còn lại `ON_TRACK`; không cần job nền, dữ liệu luôn khớp thời điểm gọi `GET`.
- NCL-05-CN-008-TC-03: Kiểm soát phân quyền — chỉ Quản lý dự án (VT-02) thấy và dùng được nút thêm/sửa/hoàn thành/xóa; vai trò khác bị ẩn hoàn toàn thao tác trên giao diện (backend đã chặn 403 + ghi log ở lớp `AccessDeniedAuditRecorder`, không đổi).
- Toàn bộ 5 endpoint (`GET/POST/PUT /milestones`, `POST /milestones/{id}/complete`, `DELETE /milestones/{id}`) đều được frontend gọi và xử lý thông báo lỗi (`VALIDATION_ERROR`, `INVALID_STATE`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`) khớp `docs/04-api/api-contract.md § NCL-05-CN-008`.

Test / QA steps
1. Đăng nhập với tài khoản Quản lý dự án (`role = 'VT-02'`) trên một dự án đang `RUNNING` và đã có cây công việc.
2. Mở trang chi tiết dự án (`ProjectDetailPage`) — cuộn xuống khối "Mốc tiến độ dự án" ngay dưới cây WBS.
3. Bấm "+ Thêm mốc tiến độ" → điền tên, ngày kế hoạch, chọn ít nhất một công việc trong danh sách → Lưu → xác nhận mốc mới xuất hiện với trạng thái `ON_TRACK` (hoặc `LATE` nếu ngày kế hoạch đã qua).
4. Bấm "Sửa" trên một mốc → xác nhận form điền sẵn đúng dữ liệu (kể cả các công việc đã chọn trước đó) → đổi tên/ngày → Lưu → xác nhận cập nhật thành công.
5. Bấm "Hoàn thành" trên một mốc chưa `DONE` → nhập ngày thực tế → xác nhận trạng thái chuyển thành `DONE`, nút "Hoàn thành" biến mất khỏi dòng đó.
6. Thử nhập ngày thực tế ở tương lai → xác nhận bị chặn ngay trên form với thông báo lỗi, không gọi API.
7. Bấm "Xóa" một mốc → xác nhận hộp thoại → xác nhận mốc biến mất khỏi bảng.
8. Thử để trống tên mốc hoặc không chọn công việc nào khi tạo/sửa → xác nhận hiển thị lỗi validation tương ứng, không gọi API.
9. Đăng nhập với vai trò khác (ví dụ `VT-03`, `VT-01`) → xác nhận nút "+ Thêm mốc tiến độ" và mọi thao tác Sửa/Hoàn thành/Xóa trên từng dòng đều không hiển thị (chỉ xem được bảng).
10. Thử trên một dự án chưa có cây công việc → xác nhận nút "+ Thêm mốc tiến độ" bị vô hiệu hóa kèm chú thích giải thích lý do.
11. Thử trên một dự án đã `CLOSED` → xác nhận cảnh báo "Dự án đã đóng…" hiển thị và toàn bộ thao tác chỉnh sửa bị ẩn.

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không lỗi kiểu dữ liệu (0 errors).
- [x] `vitest run` pass 100% (57 test files, 402/402 tests pass — bao gồm 11 test mới cho `ProjectMilestoneTimeline` và 8 test mới cho validator).
- [x] `eslint` sạch sẽ trên toàn bộ file đã sửa và file mới (0 errors, 0 warnings). Lưu ý: `npx eslint .` trên toàn repo còn 6 lỗi tồn tại từ trước ở các module không liên quan (`customers`, `departments`, `opportunities`, `users`) — không thuộc phạm vi thay đổi của nhánh này.
- [x] `vite build` tạo production bundle sạch sẽ (không lỗi; chỉ có cảnh báo kích thước chunk mang tính chung của toàn app, không phát sinh từ thay đổi này).
- [x] Khớp 100% spec `docs/04-api/api-contract.md § NCL-05-CN-008`.
- [ ] Kiểm thử tay trên trình duyệt thật: **chưa thực hiện được** trong phiên làm việc này vì `ProjectDetailPage` hiện chưa được gắn vào điều hướng chính (`App.tsx`) ở bất kỳ nhánh nào tính đến `develop-backup` — đây là khoảng trống điều hướng có từ trước (không phát sinh bởi thay đổi này), sẽ cần một bước tích hợp nav riêng (thuộc phạm vi story khác) trước khi có thể click-through trực tiếp trong ứng dụng chạy thật.
