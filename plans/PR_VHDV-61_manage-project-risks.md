Title: FE: NCL-05-CN-009 — Quản lý rủi ro dự án

Summary
- Xây dựng trang độc lập "Rủi ro dự án" (`ProjectRiskPage.tsx`) — bảng theo dõi rủi ro sắp theo điểm rủi ro (`score`) giảm dần (đúng thứ tự backend trả về), hiển thị mô tả, tác động, khả năng xảy ra, điểm/mức độ (severity) tính động, trạng thái xử lý (`OPEN`/`MITIGATING`/`CLOSED`) và người theo dõi — khớp 100% `ProjectRiskRes` từ backend.
- Bổ sung modal ghi nhận/sửa rủi ro (`RiskFormModal.tsx`): mô tả, chọn mức tác động và khả năng xảy ra (`LOW`/`MEDIUM`/`HIGH`), biện pháp giảm thiểu (tùy chọn), và ô nhập id người theo dõi kèm nút tiện ích "Theo dõi bởi tôi" (tự điền id tài khoản đang đăng nhập) — theo đúng quy ước đã có của `CreateProjectModal.tsx` cho `projectManagerId`, vì vai trò Quản lý dự án (`VT-02`) không có quyền gọi `GET /users` (chỉ `VT-07`) để tra cứu danh sách tài khoản.
- Đổi trạng thái xử lý rủi ro trực tiếp trên bảng bằng `<select>` per-row (gọi `PUT /risks/{riskId}/status` ngay khi chọn) thay vì phải mở lại modal — vì backend cho phép chuyển tự do giữa 3 trạng thái, không theo trình tự bắt buộc như trạng thái mốc thanh toán hợp đồng.
- Bổ sung API client tại `projectsApi.ts`: `getRisks`, `createRisk`, `updateRisk`, `changeRiskStatus`, `deleteRisk` — gọi đúng endpoint `GET/POST/PUT/DELETE /projects/{projectId}/risks[/{riskId}[/status]]` của `ProjectRiskController`.
- Bổ sung kiểu dữ liệu tại `projectTypes.ts`: `RiskLevel`, `RiskStatus`, `ProjectRiskRes`, `ProjectRiskReq`, `ProjectRiskStatusReq` — khớp từng trường DTO backend.
- Bổ sung validator client-side `validateRiskForm`: mô tả không rỗng, bắt buộc chọn mức tác động và khả năng xảy ra, người theo dõi phải có id hợp lệ (>0); biện pháp giảm thiểu là tùy chọn.
- Kiểm soát phân quyền đúng đặc thù backend (TC-03): **toàn bộ** endpoint rủi ro — kể cả xem danh sách (`GET`) — chỉ dành cho Quản lý dự án (`VT-02`), khác với mốc tiến độ/WBS vốn cho VT-01/VT-03 xem được. `ProjectRiskPage` vì vậy chặn hẳn (Access Denied) với mọi vai trò khác VT-02, không chỉ ẩn nút thao tác.
- Chặn thao tác ghi khi dự án đã đóng (khớp rule backend `requireOpenProject` → `400 INVALID_STATE`): ẩn nút "+ Ghi nhận rủi ro", ẩn nút Sửa/Xóa từng dòng, và thay `<select>` đổi trạng thái bằng badge tĩnh khi dự án không còn `RUNNING`.
- Thêm điểm tích hợp tối thiểu vào `ProjectDetailPage.tsx`: nút "Rủi ro dự án" (chỉ hiện với VT-02) gọi callback `onOpenRisks?(projectId)` do màn cha (nơi quản lý điều hướng) quyết định chuyển sang `ProjectRiskPage` — theo đúng mẫu `onBack`/`onOpenActivities` đã dùng cho các luồng điều hướng khác trong `App.tsx`, không tự ý thêm route/nav cứng.

Files changed
- `frontend/src/modules/projects/types/projectTypes.ts` (thêm `RiskLevel`, `RiskStatus`, `ProjectRiskRes`, `ProjectRiskReq`, `ProjectRiskStatusReq`)
- `frontend/src/modules/projects/api/projectsApi.ts` (thêm `getRisks`, `createRisk`, `updateRisk`, `changeRiskStatus`, `deleteRisk`)
- `frontend/src/modules/projects/validators/projectValidators.ts` (thêm `validateRiskForm`)
- `frontend/src/modules/projects/validators/__tests__/projectValidators.test.ts` (bổ sung 5 unit tests cho `validateRiskForm`)
- `frontend/src/modules/projects/components/RiskFormModal.tsx` (hoàn thiện file rỗng có sẵn — modal tạo/sửa rủi ro)
- `frontend/src/modules/projects/pages/ProjectRiskPage.tsx` (hoàn thiện file rỗng có sẵn — trang bảng theo dõi rủi ro)
- `frontend/src/modules/projects/__tests__/ProjectRiskPage.test.tsx` (mới, 11 unit tests bao phủ TC-01 → TC-03)
- `frontend/src/modules/projects/pages/ProjectDetailPage.tsx` (thêm prop `onOpenRisks` và nút "Rủi ro dự án" cho VT-02)
- `frontend/src/modules/projects/__tests__/ProjectDetailPage.test.tsx` (bổ sung 2 unit tests cho nút/callback `onOpenRisks`, cập nhật mock `projectsApi` — không đổi hành vi test cũ)

Acceptance criteria mapping
- NCL-05-CN-009-TC-01: Quản lý dự án (VT-02) ghi nhận rủi ro với mô tả, mức tác động, khả năng xảy ra, biện pháp (tùy chọn) và người theo dõi (tài khoản đang hoạt động); hệ thống từ chối khi thiếu trường bắt buộc hoặc dự án đã đóng.
- NCL-05-CN-009-TC-02: Bảng theo dõi rủi ro tự tính điểm rủi ro (`score` = trọng số tác động × trọng số khả năng, 1..9) và mức độ (`severity`: ≥6 HIGH, ≥3 MEDIUM, còn lại LOW) tại thời điểm xem, sắp theo điểm giảm dần — không cần job nền, dữ liệu luôn khớp thời điểm gọi `GET`.
- NCL-05-CN-009-TC-03: Kiểm soát phân quyền — **chỉ** Quản lý dự án (VT-02) truy cập được trang rủi ro (kể cả xem); vai trò khác nhận màn "Không có thẩm quyền" ngay khi mở, không có cách nào thấy được dữ liệu rủi ro (backend đã chặn 403 + ghi log ở `AccessDeniedAuditRecorder`, không đổi).
- NCL-05-CN-009-TC-04: Mọi thao tác tạo/cập nhật/đổi trạng thái/xóa đều gọi đúng endpoint và hiển thị lỗi tương ứng (`VALIDATION_ERROR`, `INVALID_STATE`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`) khớp `docs/04-api/api-contract.md § NCL-05-CN-009` (ghi nhật ký dự án ở backend, không đổi).

Test / QA steps
1. Đăng nhập với tài khoản Quản lý dự án (`role = 'VT-02'`) trên một dự án đang `RUNNING`.
2. Mở trang chi tiết dự án (`ProjectDetailPage`) → bấm nút "Rủi ro dự án" ở góc phải header → xác nhận chuyển sang `ProjectRiskPage` đúng dự án.
3. Bấm "+ Ghi nhận rủi ro" → điền mô tả, chọn mức tác động/khả năng xảy ra, (tùy chọn) biện pháp giảm thiểu, nhập id người theo dõi hoặc bấm "Theo dõi bởi tôi" → Lưu → xác nhận rủi ro mới xuất hiện với điểm/mức độ tính đúng (ví dụ HIGH × MEDIUM = 6 → HIGH) và trạng thái mặc định "Chưa xử lý" (OPEN).
4. Bấm "Sửa" trên một rủi ro → xác nhận form điền sẵn đúng dữ liệu → đổi nội dung → Lưu → xác nhận cập nhật thành công, điểm/mức độ tính lại nếu đổi tác động/khả năng.
5. Đổi trạng thái trực tiếp qua ô chọn trên từng dòng (OPEN → MITIGATING → CLOSED, hoặc bất kỳ chiều nào) → xác nhận cập nhật ngay không cần mở modal.
6. Bấm "Xóa" một rủi ro → xác nhận hộp thoại → xác nhận rủi ro biến mất khỏi bảng.
7. Thử để trống mô tả, chưa chọn tác động/khả năng, hoặc bỏ trống người theo dõi khi ghi nhận/sửa → xác nhận hiển thị lỗi validation tương ứng, không gọi API.
8. Nhập id người theo dõi là tài khoản đã bị khóa (`INACTIVE`/`LOCKED`) → xác nhận backend trả lỗi và hiển thị đúng thông báo trên giao diện.
9. Đăng nhập với vai trò khác (ví dụ `VT-01`, `VT-03`) → mở thẳng `ProjectRiskPage` → xác nhận nhận màn "Không có thẩm quyền" ngay lập tức (không thấy được bảng rủi ro), và nút "Rủi ro dự án" trên `ProjectDetailPage` cũng không hiển thị với các vai trò này.
10. Thử trên một dự án đã `CLOSED` → xác nhận cảnh báo "Dự án đã đóng…" hiển thị, nút thêm/sửa/xóa bị ẩn, và cột trạng thái hiển thị badge tĩnh thay vì ô chọn.

Merge checklist (for approvers)
- [x] `tsc -b` sạch sẽ, không lỗi kiểu dữ liệu (0 errors).
- [x] `vitest run` pass 100% (58 test files, 420/420 tests pass — bao gồm 11 test mới cho `ProjectRiskPage`, 5 test mới cho `validateRiskForm`, 2 test mới cho tích hợp `onOpenRisks`).
- [x] `eslint` sạch sẽ trên toàn bộ file đã sửa và file mới (0 errors, 0 warnings).
- [x] `vite build` tạo production bundle sạch sẽ (không lỗi mới phát sinh từ thay đổi này).
- [x] Khớp 100% spec `docs/04-api/api-contract.md § NCL-05-CN-009`.
- [ ] Kiểm thử tay trên trình duyệt thật: **chưa thực hiện được** trong phiên làm việc này vì `ProjectDetailPage`/`ProjectRiskPage` chưa được gắn vào điều hướng chính (`App.tsx`) ở bất kỳ nhánh nào tính đến `develop-backup` — khoảng trống điều hướng có từ trước (đã ghi trong `plans/HANDOVER_VHDV-60.md`), không phát sinh bởi thay đổi này.
